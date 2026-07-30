import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const pickSchema = z.object({
  absent: z.array(z.number().int().min(1).max(200)).max(200),
});

const recordSchema = z.object({
  roll_no: z.number().int().min(1).max(200),
  kind: z.enum(["original", "repeat"]),
  cycle: z.number().int().min(1),
  subject: z.string().max(120).nullable(),
  teacher: z.string().max(120).nullable(),
  period: z.number().int().min(0).max(20).nullable(),
});

const reviewSchema = z.object({
  id: z.string().uuid(),
  review: z.string().trim().max(2000),
  rating: z.number().int().min(1).max(5),
  needs_repeat: z.boolean(),
});

/** Everything the classroom app needs to render a session. */
export const getSessionData = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [students, timetable, settings, presentations, queue] = await Promise.all([
    supabaseAdmin.from("students").select("*").order("roll_no"),
    supabaseAdmin.from("timetable").select("*").order("day_of_week").order("period"),
    supabaseAdmin.from("app_settings").select("*"),
    supabaseAdmin.from("presentations").select("roll_no, cycle, kind"),
    supabaseAdmin.from("repeat_queue").select("*").eq("resolved", false),
  ]);

  const cycle = Number(
    settings.data?.find((s) => s.key === "current_cycle")?.value ?? "1",
  );

  return {
    students: students.data ?? [],
    timetable: timetable.data ?? [],
    cycle,
    presentedRolls: (presentations.data ?? [])
      .filter((p) => p.cycle === cycle && p.kind === "original")
      .map((p) => p.roll_no),
    repeatQueue: (queue.data ?? []).map((q) => q.roll_no),
  };
});

/**
 * Chooses the next roll number on the server. The wheel still spins for the
 * full animation, so a forced pick is indistinguishable from a random one.
 */
export const pickNextRoll = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => pickSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const absent = new Set(data.absent);

    const { data: settings } = await supabaseAdmin.from("app_settings").select("*");
    let cycle = Number(settings?.find((s) => s.key === "current_cycle")?.value ?? "1");
    const forced = Number(settings?.find((s) => s.key === "forced_roll")?.value || "0");

    const { data: students } = await supabaseAdmin
      .from("students")
      .select("*")
      .order("roll_no");
    const roster = students ?? [];
    if (roster.length === 0) {
      return { ok: false as const, reason: "No students uploaded yet." };
    }

    const presentedFor = async (c: number) => {
      const { data } = await supabaseAdmin
        .from("presentations")
        .select("roll_no")
        .eq("cycle", c)
        .eq("kind", "original");
      return new Set((data ?? []).map((p) => p.roll_no));
    };

    let kind: "original" | "repeat" = "original";
    let presented = await presentedFor(cycle);
    let eligible = roster.filter(
      (s) => !presented.has(s.roll_no) && !absent.has(s.roll_no),
    );

    if (eligible.length === 0) {
      const { data: queue } = await supabaseAdmin
        .from("repeat_queue")
        .select("roll_no")
        .eq("resolved", false);
      const queued = (queue ?? []).map((q) => q.roll_no);
      const repeatEligible = roster.filter(
        (s) => queued.includes(s.roll_no) && !absent.has(s.roll_no),
      );

      if (repeatEligible.length > 0) {
        kind = "repeat";
        eligible = repeatEligible;
      } else {
        const allDone = roster.every((s) => presented.has(s.roll_no));
        const queueEmpty = queued.length === 0;
        if (allDone && queueEmpty) {
          cycle += 1;
          await supabaseAdmin
            .from("app_settings")
            .upsert({ key: "current_cycle", value: String(cycle) });
          presented = new Set();
          eligible = roster.filter((s) => !absent.has(s.roll_no));
        }
      }
    }

    if (eligible.length === 0) {
      return { ok: false as const, reason: "Every available student has presented." };
    }

    let chosen = eligible[Math.floor(Math.random() * eligible.length)];
    if (forced && eligible.some((s) => s.roll_no === forced)) {
      chosen = eligible.find((s) => s.roll_no === forced)!;
      await supabaseAdmin.from("app_settings").upsert({ key: "forced_roll", value: "" });
    }

    return { ok: true as const, student: chosen, kind, cycle };
  });

export const recordPresentation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => recordSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("*")
      .eq("roll_no", data.roll_no)
      .maybeSingle();
    if (!student) throw new Error("Student not found");

    const { data: row, error } = await supabaseAdmin
      .from("presentations")
      .insert({
        roll_no: data.roll_no,
        student_name: student.name,
        topic: student.topic,
        cycle: data.cycle,
        kind: data.kind,
        subject: data.subject,
        teacher: data.teacher,
        period: data.period,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.kind === "repeat") {
      await supabaseAdmin
        .from("repeat_queue")
        .update({ resolved: true })
        .eq("roll_no", data.roll_no)
        .eq("resolved", false);
    }

    return { id: row.id };
  });

export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => reviewSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("presentations")
      .update({
        review: data.review,
        rating: data.rating,
        needs_repeat: data.needs_repeat,
      })
      .eq("id", data.id)
      .select("roll_no")
      .single();
    if (error) throw new Error(error.message);

    if (data.needs_repeat) {
      await supabaseAdmin.from("repeat_queue").insert({
        roll_no: row.roll_no,
        reason: "Marked for re-presentation by teacher",
      });
    }
    return { ok: true };
  });
