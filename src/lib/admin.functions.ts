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
  const [students, timetable, teachers, departments, subjects, queue, settings, history] =
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
    ]);
  return {
    students: students.data ?? [],
    timetable: timetable.data ?? [],
    teachers: teachers.data ?? [],
    departments: departments.data ?? [],
    subjects: subjects.data ?? [],
    queue: queue.data ?? [],
    history: history.data ?? [],
    cycle: Number(settings.data?.find((s) => s.key === "current_cycle")?.value ?? "1"),
    forcedRoll: settings.data?.find((s) => s.key === "forced_roll")?.value ?? "",
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
