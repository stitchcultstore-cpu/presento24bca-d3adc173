import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminSession, isAdmin, requireAdmin } from "./admin-session.server";

const studentSchema = z.object({
  roll_no: z.number().int().min(1).max(200),
  name: z.string().trim().min(1).max(120),
  topic: z.string().trim().max(300).nullable(),
  photo_url: z.string().trim().max(600).nullable(),
});

const timetableSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  period: z.number().int().min(1).max(20),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  subject: z.string().trim().min(1).max(120),
  teacher: z.string().trim().min(1).max(120),
  department: z.string().trim().min(1).max(120),
  semester: z.string().trim().min(1).max(40),
  section: z.string().trim().min(1).max(40),
});

const namedSchema = z.object({
  table: z.enum(["teachers", "departments", "subjects"]),
  name: z.string().trim().min(1).max(120),
  extra: z.string().trim().max(120).nullable(),
});

export const adminStatus = createServerFn({ method: "GET" }).handler(async () => ({
  authenticated: await isAdmin(),
}));

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ password: z.string().max(200) }).parse(data))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) throw new Error("ADMIN_PASSWORD is not configured");
    if (data.password !== expected) return { ok: false as const };
    const session = await getAdminSession();
    await session.update({ admin: true });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getAdminSession();
  await session.clear();
  return { ok: true };
});

export const adminData = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [students, timetable, teachers, departments, subjects, queue, settings, history, allCycles] =
    await Promise.all([
      supabaseAdmin.from("students").select("*").order("roll_no"),
      supabaseAdmin.from("timetable").select("*").order("day_of_week").order("period"),
      supabaseAdmin.from("teachers").select("*").order("name"),
      supabaseAdmin.from("departments").select("*").order("name"),
      supabaseAdmin.from("subjects").select("*").order("name"),
      supabaseAdmin.from("repeat_queue").select("*").order("created_at"),
      supabaseAdmin.from("app_settings").select("*"),
      supabaseAdmin
        .from("presentations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin.from("presentations").select("cycle"),
    ]);
  const setting = (key: string) =>
    settings.data?.find((s) => s.key === key)?.value ?? "";
  const roster = students.data ?? [];
  const overrideRaw = setting("override_day");
  return {
    students: roster,
    timetable: timetable.data ?? [],
    teachers: teachers.data ?? [],
    departments: departments.data ?? [],
    subjects: subjects.data ?? [],
    queue: (queue.data ?? []).map((q) => ({
      ...q,
      name: roster.find((s) => s.roll_no === q.roll_no)?.name ?? `Roll ${q.roll_no}`,
    })),
    history: history.data ?? [],
    cycles: Array.from(new Set((allCycles.data ?? []).map((c) => c.cycle))).sort(
      (a, b) => b - a,
    ),
    cycle: Number(setting("current_cycle") || "1"),
    forcedRoll: setting("forced_roll"),
    overrideDay: overrideRaw === "" ? null : Number(overrideRaw),
    defaultWeight: Number(setting("default_weight") || "100"),
    presented: (history.data ?? [])
      .filter(
        (h) => h.cycle === Number(setting("current_cycle") || "1") && h.kind === "original",
      )
      .map((h) => ({ id: h.id, roll_no: h.roll_no, name: h.student_name }))
      .sort((a, b) => a.roll_no - b.roll_no),
  };
});

/** Marks a student as already presented in the current cycle (removes them from the wheel). */
export const markPresented = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ roll_no: z.number().int().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("roll_no, name, topic")
      .eq("roll_no", data.roll_no)
      .maybeSingle();
    if (!student) throw new Error(`Roll ${data.roll_no} is not on the roster`);

    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("*")
      .eq("key", "current_cycle")
      .maybeSingle();
    const cycle = Number(settings?.value ?? "1");

    const { data: existing } = await supabaseAdmin
      .from("presentations")
      .select("id")
      .eq("roll_no", data.roll_no)
      .eq("cycle", cycle)
      .eq("kind", "original")
      .maybeSingle();
    if (existing) throw new Error(`Roll ${data.roll_no} is already marked as presented`);

    const { error } = await supabaseAdmin.from("presentations").insert({
      roll_no: student.roll_no,
      student_name: student.name,
      topic: student.topic,
      cycle,
      kind: "original",
      review: "Marked as completed by admin",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Removes a student from the presented list for the current cycle (back into the wheel). */
export const unmarkPresented = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ roll_no: z.number().int().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("*")
      .eq("key", "current_cycle")
      .maybeSingle();
    const cycle = Number(settings?.value ?? "1");
    const { error } = await supabaseAdmin
      .from("presentations")
      .delete()
      .eq("roll_no", data.roll_no)
      .eq("cycle", cycle);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Sets how likely a single student is to be picked next (100 = normal). */
export const setStudentWeight = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        roll_no: z.number().int().min(1).max(200),
        weight: z.number().int().min(0).max(1000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("students")
      .update({ pick_weight: data.weight })
      .eq("roll_no", data.roll_no);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Default chance applied to every student, and optionally resets everyone to it. */
export const setDefaultWeight = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ weight: z.number().int().min(1).max(1000), applyToAll: z.boolean() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "default_weight", value: String(data.weight) });
    if (data.applyToAll) {
      const { error } = await supabaseAdmin
        .from("students")
        .update({ pick_weight: data.weight })
        .gte("roll_no", 0);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Makes the app behave as another weekday (e.g. Monday's timetable on a Saturday). */
export const setOverrideDay = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ day: z.number().int().min(0).max(6).nullable() }).parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "override_day", value: data.day == null ? "" : String(data.day) });
    return { ok: true };
  });

/** Manually queues a student for re-presentation, putting them back in the pool. */
export const addRepeatEntry = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        roll_no: z.number().int().min(1).max(200),
        reason: z.string().trim().max(300).nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("roll_no")
      .eq("roll_no", data.roll_no)
      .maybeSingle();
    if (!student) throw new Error(`Roll ${data.roll_no} is not on the roster`);

    const { data: existing } = await supabaseAdmin
      .from("repeat_queue")
      .select("id")
      .eq("roll_no", data.roll_no)
      .eq("resolved", false)
      .maybeSingle();
    if (existing) throw new Error(`Roll ${data.roll_no} is already in the list`);

    const { error } = await supabaseAdmin
      .from("repeat_queue")
      .insert({ roll_no: data.roll_no, reason: data.reason ?? "Added by admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Bulk timetable import from an Excel upload. */
export const importTimetable = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        mode: z.enum(["replace", "merge"]),
        rows: z.array(timetableSchema).min(1).max(500),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.mode === "replace") {
      await supabaseAdmin.from("timetable").delete().gte("day_of_week", 0);
      const { error } = await supabaseAdmin.from("timetable").insert(data.rows);
      if (error) throw new Error(error.message);
      return { count: data.rows.length };
    }

    for (const row of data.rows) {
      const { data: existing } = await supabaseAdmin
        .from("timetable")
        .select("id")
        .eq("day_of_week", row.day_of_week)
        .eq("period", row.period)
        .maybeSingle();
      const { error } = existing
        ? await supabaseAdmin.from("timetable").update(row).eq("id", existing.id)
        : await supabaseAdmin.from("timetable").insert(row);
      if (error) throw new Error(error.message);
    }
    return { count: data.rows.length };
  });


export const cycleReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ cycle: z.number().int().min(1).max(1000) }).parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [presentations, students] = await Promise.all([
      supabaseAdmin
        .from("presentations")
        .select("*")
        .eq("cycle", data.cycle)
        .order("presented_on")
        .order("created_at"),
      supabaseAdmin.from("students").select("roll_no, name, topic").order("roll_no"),
    ]);
    const rows = presentations.data ?? [];
    const presentedRolls = new Set(
      rows.filter((r) => r.kind === "original").map((r) => r.roll_no),
    );
    return {
      cycle: data.cycle,
      rows,
      pending: (students.data ?? []).filter((s) => !presentedRolls.has(s.roll_no)),
    };
  });

export const importStudents = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ replace: z.boolean(), rows: z.array(studentSchema).min(1).max(500) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.replace) {
      await supabaseAdmin.from("students").delete().gte("roll_no", 0);
    }
    const { error } = await supabaseAdmin
      .from("students")
      .upsert(data.rows, { onConflict: "roll_no" });
    if (error) throw new Error(error.message);
    return { count: data.rows.length };
  });

export const saveStudent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => studentSchema.parse(data))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("students")
      .upsert(data, { onConflict: "roll_no" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRow = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        table: z.enum(["students", "timetable", "teachers", "departments", "subjects", "repeat_queue"]),
        id: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveTimetableEntry = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => timetableSchema.parse(data))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("timetable").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveNamed = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => namedSchema.parse(data))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const error =
      data.table === "teachers"
        ? (await supabaseAdmin
            .from("teachers")
            .insert({ name: data.name, department: data.extra })).error
        : data.table === "departments"
          ? (await supabaseAdmin
              .from("departments")
              .insert({ name: data.name, code: data.extra })).error
          : (await supabaseAdmin
              .from("subjects")
              .insert({ name: data.name, code: data.extra })).error;
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const setForcedRoll = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ roll_no: z.number().int().min(0).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "forced_roll", value: data.roll_no ? String(data.roll_no) : "" });
    return { ok: true };
  });

export const resetCycle = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ mode: z.enum(["restart", "next"]) }).parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("*")
      .eq("key", "current_cycle")
      .maybeSingle();
    const cycle = Number(settings?.value ?? "1");
    if (data.mode === "next") {
      await supabaseAdmin
        .from("app_settings")
        .upsert({ key: "current_cycle", value: String(cycle + 1) });
    } else {
      await supabaseAdmin.from("presentations").delete().eq("cycle", cycle);
    }
    return { ok: true };
  });
