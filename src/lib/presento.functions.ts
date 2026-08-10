import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GRADE_RATING, REVIEW_GRADES } from "./review";


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
  review_grade: z.enum(REVIEW_GRADES),
  review: z.string().trim().max(2000),
  needs_repeat: z.boolean(),
  duration_seconds: z.number().int().min(0).max(36000).optional(),
});

const topicSchema = z.object({
  roll_no: z.number().int().min(1).max(200),
  topic: z.string().trim().min(2).max(300),
  presentation_id: z.string().uuid().nullable().optional(),
});

const todayKey = () => new Date().toISOString().slice(0, 10);

/** Lets a student type their topic on the spot when it is missing from the roster. */
export const setStudentTopic = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => topicSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("students")
      .update({ topic: data.topic })
      .eq("roll_no", data.roll_no);
    if (error) throw new Error(error.message);

    if (data.presentation_id) {
      await supabaseAdmin
        .from("presentations")
        .update({ topic: data.topic })
        .eq("id", data.presentation_id);
    }

    return { ok: true as const, topic: data.topic };
  });


/** Everything the classroom app needs to render a session. */
export const getSessionData = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [students, timetable, settings, presentations, queue] = await Promise.all([
    supabaseAdmin.from("students").select("*").order("roll_no"),
    supabaseAdmin.from("timetable").select("*").order("day_of_week").order("period"),
    supabaseAdmin.from("app_settings").select("*"),
    supabaseAdmin.from("presentations").select("roll_no, student_name, cycle, kind"),
    supabaseAdmin.from("repeat_queue").select("*").eq("resolved", false),
  ]);

  const setting = (key: string) => settings.data?.find((s) => s.key === key)?.value ?? "";
  const cycle = Number(setting("current_cycle") || "1");
  const overrideRaw = setting("override_day");
  const overrideDay =
    overrideRaw === "" || overrideRaw == null ? null : Number(overrideRaw);

  const roster = students.data ?? [];
  const nameOf = (roll: number) =>
    roster.find((s) => s.roll_no === roll)?.name ?? `Roll ${roll}`;

  const presentedRows = (presentations.data ?? []).filter(
    (p) => p.cycle === cycle && p.kind === "original",
  );

  const absentDate = setting("absent_date");
  const absent =
    absentDate === todayKey()
      ? setting("absent_rolls")
          .split(",")
          .map((v) => Number(v))
          .filter((n) => Number.isInteger(n) && n > 0)
      : [];

  return {
    students: roster,
    timetable: timetable.data ?? [],
    cycle,
    overrideDay: Number.isInteger(overrideDay) ? overrideDay : null,
    absent,
    absentConfirmed: absentDate === todayKey(),
    presentedRolls: presentedRows.map((p) => p.roll_no),
    presentedStudents: Array.from(
      new Map(
        presentedRows.map((p) => [p.roll_no, { roll_no: p.roll_no, name: nameOf(p.roll_no) }]),
      ).values(),
    ).sort((a, b) => a.roll_no - b.roll_no),
    repeatQueue: (queue.data ?? []).map((q) => q.roll_no),
    repeatStudents: (queue.data ?? [])
      .map((q) => ({ roll_no: q.roll_no, name: nameOf(q.roll_no) }))
      .sort((a, b) => a.roll_no - b.roll_no),
  };
});

/** Persists today's absentees so a page refresh keeps the session intact. */
export const saveAbsentees = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => pickSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "absent_rolls", value: data.absent.join(",") });
    await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "absent_date", value: todayKey() });
    return { ok: true };
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

    const { data: queue } = await supabaseAdmin
      .from("repeat_queue")
      .select("roll_no")
      .eq("resolved", false);
    const queued = new Set((queue ?? []).map((q) => q.roll_no));

    let presented = await presentedFor(cycle);

    // Fresh students plus anyone pending a re-presentation; absentees skipped.
    const buildPool = () =>
      roster.filter(
        (s) => !absent.has(s.roll_no) && (!presented.has(s.roll_no) || queued.has(s.roll_no)),
      );

    let pool = buildPool();

    if (pool.length === 0 && roster.every((s) => presented.has(s.roll_no))) {
      cycle += 1;
      await supabaseAdmin
        .from("app_settings")
        .upsert({ key: "current_cycle", value: String(cycle) });
      presented = new Set();
      pool = buildPool();
    }

    if (pool.length === 0) {
      return { ok: false as const, reason: "Every available student has presented." };
    }

    // Weighted random pick: each student's pick_weight is their relative chance.
    const defaultWeight = Number(
      settings?.find((s) => s.key === "default_weight")?.value || "100",
    );
    const weightOf = (s: (typeof pool)[number]) => {
      const w = (s as { pick_weight?: number | null }).pick_weight;
      return Math.max(0, Number(w ?? defaultWeight));
    };
    const total = pool.reduce((sum, s) => sum + weightOf(s), 0);
    let chosen = pool[Math.floor(Math.random() * pool.length)];
    if (total > 0) {
      let ticket = Math.random() * total;
      for (const s of pool) {
        ticket -= weightOf(s);
        if (ticket <= 0) {
          chosen = s;
          break;
        }
      }
    }
    if (forced && pool.some((s) => s.roll_no === forced)) {
      chosen = pool.find((s) => s.roll_no === forced)!;
      await supabaseAdmin.from("app_settings").upsert({ key: "forced_roll", value: "" });
    }

    const kind: "original" | "repeat" =
      queued.has(chosen.roll_no) && presented.has(chosen.roll_no) ? "repeat" : "original";

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
        review_grade: data.review_grade,
        review: data.review,
        rating: GRADE_RATING[data.review_grade] ?? 3,
        needs_repeat: data.needs_repeat,
        duration_seconds: data.duration_seconds ?? null,
      })
      .eq("id", data.id)
      .select("roll_no")
      .single();
    if (error) throw new Error(error.message);

    if (data.needs_repeat) {
      const { data: existing } = await supabaseAdmin
        .from("repeat_queue")
        .select("id")
        .eq("roll_no", row.roll_no)
        .eq("resolved", false)
        .maybeSingle();
      if (!existing) {
        await supabaseAdmin.from("repeat_queue").insert({
          roll_no: row.roll_no,
          reason: "Marked for re-presentation by teacher",
        });
      }
    }
    return { ok: true };
  });
