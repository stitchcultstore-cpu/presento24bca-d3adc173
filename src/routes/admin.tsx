import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addRepeatEntry,
  adminData,
  adminLogin,
  adminLogout,
  adminStatus,
  cycleReport,
  deleteRow,
  importStudents,
  importTimetable,
  resetCycle,
  saveNamed,
  saveStudent,
  saveTimetableEntry,
  setForcedRoll,
  setOverrideDay,
} from "@/lib/admin.functions";
import { DAY_NAMES, formatTime, toMinutes } from "@/lib/timetable";


export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — Presento" },
      {
        name: "description",
        content:
          "Password-protected Presento admin panel for students, teachers, departments, subjects, timetable, cycles and the re-presentation queue.",
      },
      { property: "og:title", content: "Admin Panel — Presento" },
      {
        property: "og:description",
        content: "Manage the Presento roster, timetable and presentation cycles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AdminPage() {
  const status = useServerFn(adminStatus);
  const login = useServerFn(adminLogin);
  const logout = useServerFn(adminLogout);

  const { data: auth, refetch: refetchAuth } = useQuery({
    queryKey: ["admin-status"],
    queryFn: () => status(),
  });
  const [password, setPassword] = useState("");

  const doLogin = useMutation({
    mutationFn: async () => login({ data: { password } }),
    onSuccess: async (r) => {
      if (!r.ok) return toast.error("Incorrect password");
      setPassword("");
      await refetchAuth();
    },
  });

  if (!auth?.authenticated) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <div className="rounded-lg border border-border bg-card p-7 shadow-[var(--shadow-card)]">
          <h1 className="text-lg font-semibold">Presento Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the administrator password to continue.
          </p>
          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              doLogin.mutate();
            }}
          >
            <Label htmlFor="pw">Password</Label>
            <Input
              id="pw"
              type="password"
              value={password}
              maxLength={200}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" disabled={doLogin.isPending}>
              Sign in
            </Button>
          </form>
          <Link
            to="/"
            className="mt-5 block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Back to main application
          </Link>
        </div>
      </main>
    );
  }

  return <AdminDashboard onLogout={async () => {
    await logout();
    await refetchAuth();
  }} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const fetchAll = useServerFn(adminData);
  const importFn = useServerFn(importStudents);
  const saveStudentFn = useServerFn(saveStudent);
  const deleteFn = useServerFn(deleteRow);
  const saveTimetableFn = useServerFn(saveTimetableEntry);
  const saveNamedFn = useServerFn(saveNamed);
  const forceFn = useServerFn(setForcedRoll);
  const cycleFn = useServerFn(resetCycle);
  const reportFn = useServerFn(cycleReport);
  const overrideFn = useServerFn(setOverrideDay);
  const repeatFn = useServerFn(addRepeatEntry);
  const importTimetableFn = useServerFn(importTimetable);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [ttMode, setTtMode] = useState<"replace" | "merge">("replace");

  const { data, refetch } = useQuery({ queryKey: ["admin-data"], queryFn: () => fetchAll() });
  const fileRef = useRef<HTMLInputElement>(null);
  const ttFileRef = useRef<HTMLInputElement>(null);


  const cycleList: number[] = (() => {
    const set = new Set<number>(data?.cycles ?? []);
    set.add(data?.cycle ?? 1);
    return Array.from(set).sort((a, b) => b - a);
  })();

  const fmtDuration = (secs: number | null) => {
    if (secs == null) return "—";
    const m = Math.floor(secs / 60);
    const s2 = secs % 60;
    return `${m}m ${String(s2).padStart(2, "0")}s`;
  };

  const downloadReport = async (cycle: number) => {
    setDownloading(cycle);
    try {
      const report = await reportFn({ data: { cycle } });
      const XLSX = await import("xlsx");
      const rows = report.rows.map((r, i) => ({
        "#": i + 1,
        Roll: r.roll_no,
        Student: r.student_name,
        Topic: r.topic ?? "",
        Type: r.kind === "repeat" ? "Re-presentation" : "Original",
        Date: r.presented_on,
        Period: r.period ?? "",
        Subject: r.subject ?? "",
        Teacher: r.teacher ?? "",
        "Time taken": fmtDuration(r.duration_seconds),
        "Time taken (s)": r.duration_seconds ?? "",
        Review: r.review_grade ?? "",
        Rating: r.rating ?? "",
        "Teacher remarks": r.review ?? "",

        "Needs re-presentation": r.needs_repeat ? "Yes" : "No",
      }));
      const wb = XLSX.utils.book_new();
      const sheet = XLSX.utils.json_to_sheet(
        rows.length ? rows : [{ Note: "No presentations recorded in this cycle" }],
      );
      sheet["!cols"] = [
        { wch: 4 },
        { wch: 6 },
        { wch: 24 },
        { wch: 34 },
        { wch: 16 },
        { wch: 12 },
        { wch: 8 },
        { wch: 18 },
        { wch: 18 },
        { wch: 12 },
        { wch: 14 },
        { wch: 18 },
        { wch: 8 },

        { wch: 50 },
        { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, sheet, `Cycle ${cycle}`);
      const pendingSheet = XLSX.utils.json_to_sheet(
        report.pending.length
          ? report.pending.map((p) => ({ Roll: p.roll_no, Student: p.name, Topic: p.topic ?? "" }))
          : [{ Note: "Every student has presented in this cycle" }],
      );
      pendingSheet["!cols"] = [{ wch: 6 }, { wch: 24 }, { wch: 34 }];
      XLSX.utils.book_append_sheet(wb, pendingSheet, "Yet to present");
      XLSX.writeFile(wb, `presento-cycle-${cycle}-report.xlsx`);
      toast.success(`Cycle ${cycle} report downloaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the report");
    } finally {
      setDownloading(null);
    }
  };

  const run = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      toast.success(message);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const onFile = async (file: File) => {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    const rows = raw
      .map((r) => {
        const get = (...keys: string[]) => {
          for (const k of Object.keys(r)) {
            if (keys.includes(k.toLowerCase().trim())) return r[k];
          }
          return undefined;
        };
        const roll = Number(get("roll", "roll_no", "roll no", "rollnumber", "roll number"));
        const name = String(get("name", "student", "student name") ?? "").trim();
        const topic = get("topic", "presentation topic");
        const photo = get("photo", "photo_url", "image");
        return {
          roll_no: roll,
          name,
          topic: topic ? String(topic).trim().slice(0, 300) : null,
          photo_url: photo ? String(photo).trim().slice(0, 600) : null,
        };
      })
      .filter((r) => Number.isInteger(r.roll_no) && r.roll_no > 0 && r.name);

    if (rows.length === 0) {
      toast.error("No valid rows found. Expected columns: Roll, Name, Topic.");
      return;
    }
    await run(() => importFn({ data: { replace: true, rows } }), `Imported ${rows.length} students`);
  };

  const DAY_LOOKUP: Record<string, number> = {
    sunday: 0,
    sun: 0,
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    tues: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    thurs: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6,
  };

  /** Accepts "09:30", "9:30 AM" or an Excel time serial (fraction of a day). */
  const parseTime = (value: unknown): string | null => {
    if (value == null || value === "") return null;
    if (typeof value === "number") {
      const mins = Math.round(value * 24 * 60) % (24 * 60);
      return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
    }
    const raw = String(value).trim();
    const m = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$/);
    if (!m) return null;
    let h = Number(m[1]);
    const min = Number(m[2]);
    const suffix = m[3]?.toLowerCase();
    if (suffix === "pm" && h < 12) h += 12;
    if (suffix === "am" && h === 12) h = 0;
    if (h > 23 || min > 59) return null;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  };

  const downloadTimetableTemplate = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet([
      {
        Day: "Monday",
        Period: 1,
        "Start Time": "09:00",
        "End Time": "09:50",
        Subject: "Data Structures",
        Teacher: "Dr. A. Kumar",
        Department: "BCA",
        Semester: "4",
        Section: "A",
      },
      {
        Day: "Monday",
        Period: 2,
        "Start Time": "09:50",
        "End Time": "10:40",
        Subject: "Operating Systems",
        Teacher: "Prof. S. Nair",
        Department: "BCA",
        Semester: "4",
        Section: "A",
      },
    ]);
    sheet["!cols"] = [
      { wch: 12 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 24 },
      { wch: 20 },
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, sheet, "Timetable");
    XLSX.writeFile(wb, "presento-timetable-template.xlsx");
  };

  const onTimetableFile = async (file: File) => {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      wb.Sheets[wb.SheetNames[0]],
    );

    const problems: string[] = [];
    const rows = raw.flatMap((r, index) => {
      const get = (...keys: string[]) => {
        for (const k of Object.keys(r)) {
          if (keys.includes(k.toLowerCase().trim().replace(/\s+/g, " "))) return r[k];
        }
        return undefined;
      };
      const line = index + 2;
      const dayRaw = String(get("day", "day of week", "weekday") ?? "").trim();
      const day = Number.isInteger(Number(dayRaw))
        ? Number(dayRaw)
        : DAY_LOOKUP[dayRaw.toLowerCase()];
      const period = Number(get("period", "period no", "period number"));
      const start = parseTime(get("start time", "start", "from", "start_time"));
      const end = parseTime(get("end time", "end", "to", "end_time"));
      const subject = String(get("subject") ?? "").trim();
      const teacher = String(get("teacher", "faculty") ?? "").trim();
      const department = String(get("department", "dept") ?? "").trim() || "General";
      const semester = String(get("semester", "sem") ?? "").trim() || "1";
      const section = String(get("section", "class", "classroom") ?? "").trim() || "A";

      if (day == null || Number.isNaN(day) || day < 0 || day > 6) {
        problems.push(`Row ${line}: invalid Day`);
        return [];
      }
      if (!Number.isInteger(period) || period < 1 || period > 20) {
        problems.push(`Row ${line}: invalid Period`);
        return [];
      }
      if (!start || !end) {
        problems.push(`Row ${line}: invalid Start/End Time`);
        return [];
      }
      if (toMinutes(end) <= toMinutes(start)) {
        problems.push(`Row ${line}: End Time must be after Start Time`);
        return [];
      }
      if (!subject || !teacher) {
        problems.push(`Row ${line}: Subject and Teacher are required`);
        return [];
      }
      return [
        {
          day_of_week: day,
          period,
          start_time: start,
          end_time: end,
          subject: subject.slice(0, 120),
          teacher: teacher.slice(0, 120),
          department: department.slice(0, 120),
          semester: semester.slice(0, 40),
          section: section.slice(0, 40),
        },
      ];
    });

    if (rows.length === 0) {
      toast.error(
        problems[0] ?? "No valid rows found. Expected: Day, Period, Start Time, End Time, Subject, Teacher.",
      );
      return;
    }
    if (problems.length) {
      toast.warning(`${problems.length} row(s) skipped: ${problems.slice(0, 3).join("; ")}`);
    }
    await run(
      () => importTimetableFn({ data: { mode: ttMode, rows } }),
      `Imported ${rows.length} periods`,
    );
  };



  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Presento Admin</h1>
          <p className="text-sm text-muted-foreground">
            Cycle {data?.cycle ?? 1} · {data?.students.length ?? 0} students
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/">Main app</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={onLogout}>
            Sign out
          </Button>
        </div>
      </header>

      <Tabs defaultValue="students" className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
          <TabsTrigger value="master">Master data</TabsTrigger>
          <TabsTrigger value="cycles">Cycles</TabsTrigger>
          <TabsTrigger value="queue">Re-presentation</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-5 space-y-5">
          <Panel title="Import from Excel">
            <p className="text-sm text-muted-foreground">
              Upload an .xlsx file with columns <b>Roll</b>, <b>Name</b>, and optionally{" "}
              <b>Topic</b> and <b>Photo</b>. This replaces the current roster.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = "";
              }}
            />
            <Button className="mt-4" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Choose file
            </Button>
          </Panel>

          <Panel title="Add or update a student">
            <form
              className="grid gap-3 sm:grid-cols-4"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void run(
                  () =>
                    saveStudentFn({
                      data: {
                        roll_no: Number(f.get("roll_no")),
                        name: String(f.get("name")).trim().slice(0, 120),
                        topic: (String(f.get("topic")).trim() || null) as string | null,
                        photo_url: (String(f.get("photo_url")).trim() || null) as string | null,
                      },
                    }),
                  "Student saved",
                );
                e.currentTarget.reset();
              }}
            >
              <Input name="roll_no" type="number" min={1} max={200} placeholder="Roll" required />
              <Input name="name" placeholder="Full name" maxLength={120} required />
              <Input name="topic" placeholder="Topic" maxLength={300} />
              <div className="flex gap-2">
                <Input name="photo_url" placeholder="Photo URL" maxLength={600} />
                <Button type="submit">Save</Button>
              </div>
            </form>
          </Panel>

          <Panel title="Roster">
            <div className="max-h-[26rem] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2">Roll</th>
                    <th>Name</th>
                    <th>Topic</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(data?.students ?? []).map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-2 tabular-nums">{s.roll_no}</td>
                      <td>{s.name}</td>
                      <td className="text-muted-foreground">{s.topic || "—"}</td>
                      <td className="text-right">
                        <button
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            run(
                              () => deleteFn({ data: { table: "students", id: s.id } }),
                              "Student removed",
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="timetable" className="mt-5 space-y-5">
          <Panel title="Override today's timetable">
            <p className="text-sm text-muted-foreground">
              Run the main portal on another weekday's timetable — for example Monday's
              periods on a Saturday. Disable it to return to the real current day.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {[1, 2, 3, 4, 5].map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={data?.overrideDay === d ? "default" : "outline"}
                  onClick={() =>
                    run(() => overrideFn({ data: { day: d } }), `Using ${DAY_NAMES[d]}'s timetable`)
                  }
                >
                  {DAY_NAMES[d]}
                </Button>
              ))}
              <Button
                size="sm"
                variant={data?.overrideDay == null ? "default" : "outline"}
                onClick={() => run(() => overrideFn({ data: { day: null } }), "Override disabled")}
              >
                Disable override
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Currently:{" "}
              <b className="text-foreground">
                {data?.overrideDay == null
                  ? "Automatic (real current day)"
                  : `${DAY_NAMES[data.overrideDay]} timetable`}
              </b>
            </p>
          </Panel>

          <Panel title="Upload timetable from Excel">
            <p className="text-sm text-muted-foreground">
              Upload an .xlsx file with columns <b>Day</b>, <b>Period</b>, <b>Start Time</b>,{" "}
              <b>End Time</b>, <b>Subject</b>, <b>Teacher</b> and optionally{" "}
              <b>Department</b>, <b>Semester</b>, <b>Section</b>. Rows are validated before
              importing.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <select
                value={ttMode}
                onChange={(e) => setTtMode(e.target.value as "replace" | "merge")}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="replace">Replace existing timetable</option>
                <option value="merge">Update only matching periods</option>
              </select>
              <input
                ref={ttFileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onTimetableFile(f);
                  e.target.value = "";
                }}
              />
              <Button onClick={() => ttFileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Upload timetable
              </Button>
              <Button variant="outline" onClick={() => void downloadTimetableTemplate()}>
                <Download className="mr-2 h-4 w-4" /> Sample template
              </Button>
            </div>
          </Panel>

          <Panel title="Add a period">

            <form
              className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void run(
                  () =>
                    saveTimetableFn({
                      data: {
                        day_of_week: Number(f.get("day_of_week")),
                        period: Number(f.get("period")),
                        start_time: String(f.get("start_time")),
                        end_time: String(f.get("end_time")),
                        subject: String(f.get("subject")).trim(),
                        teacher: String(f.get("teacher")).trim(),
                        department: String(f.get("department")).trim(),
                        semester: String(f.get("semester")).trim(),
                        section: String(f.get("section")).trim(),
                      },
                    }),
                  "Period added",
                );
                e.currentTarget.reset();
              }}
            >
              <select
                name="day_of_week"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {DAY_NAMES.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
              <Input name="period" type="number" min={1} max={20} placeholder="Period" required />
              <Input name="start_time" type="time" required />
              <Input name="end_time" type="time" required />
              <Input name="subject" placeholder="Subject" required />
              <Input name="teacher" placeholder="Teacher" required />
              <Input name="department" placeholder="Department" required />
              <Input name="semester" placeholder="Semester" required />
              <Input name="section" placeholder="Section" required />
              <Button type="submit">Add period</Button>
            </form>
          </Panel>

          <Panel title="Weekly timetable">
            <div className="max-h-[26rem] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2">Day</th>
                    <th>Period</th>
                    <th>Time</th>
                    <th>Subject</th>
                    <th>Teacher</th>
                    <th>Class</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(data?.timetable ?? []).map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="py-2">{DAY_NAMES[t.day_of_week]}</td>
                      <td className="tabular-nums">{t.period}</td>
                      <td className="tabular-nums">
                        {formatTime(t.start_time)}–{formatTime(t.end_time)}
                      </td>
                      <td>{t.subject}</td>
                      <td>{t.teacher}</td>
                      <td className="text-muted-foreground">
                        {t.department} · {t.semester} · {t.section}
                      </td>
                      <td className="text-right">
                        <button
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            run(
                              () => deleteFn({ data: { table: "timetable", id: t.id } }),
                              "Period removed",
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="master" className="mt-5 grid gap-5 lg:grid-cols-3">
          {(
            [
              { table: "teachers", title: "Teachers", extra: "Department" },
              { table: "departments", title: "Departments", extra: "Code" },
              { table: "subjects", title: "Subjects", extra: "Code" },
            ] as const
          ).map((cfg) => (
            <Panel key={cfg.table} title={cfg.title}>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void run(
                    () =>
                      saveNamedFn({
                        data: {
                          table: cfg.table,
                          name: String(f.get("name")).trim(),
                          extra: (String(f.get("extra")).trim() || null) as string | null,
                        },
                      }),
                    `${cfg.title} updated`,
                  );
                  e.currentTarget.reset();
                }}
              >
                <Input name="name" placeholder="Name" maxLength={120} required />
                <Input name="extra" placeholder={cfg.extra} maxLength={120} />
                <Button type="submit">Add</Button>
              </form>
              <ul className="mt-4 space-y-1.5 text-sm">
                {(data?.[cfg.table] ?? []).map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between border-b border-border pb-1.5"
                  >
                    <span>{row.name}</span>
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        run(
                          () => deleteFn({ data: { table: cfg.table, id: row.id } }),
                          "Removed",
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </TabsContent>

        <TabsContent value="cycles" className="mt-5 grid gap-5 lg:grid-cols-2">
          <Panel title="Presentation cycle">
            <p className="text-sm text-muted-foreground">
              Current cycle: <b className="text-foreground">{data?.cycle ?? 1}</b>. A new cycle
              starts automatically once every student has presented.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => run(() => cycleFn({ data: { mode: "next" } }), "Moved to next cycle")}
              >
                Start next cycle
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  run(() => cycleFn({ data: { mode: "restart" } }), "Current cycle cleared")
                }
              >
                Clear current cycle
              </Button>
            </div>
          </Panel>

          <Panel title="Force next roll number">
            <p className="text-sm text-muted-foreground">
              The wheel still spins normally, but lands on this roll number for the next pick.
              Currently forced: <b className="text-foreground">{data?.forcedRoll || "none"}</b>
            </p>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void run(
                  () => forceFn({ data: { roll_no: Number(f.get("roll_no") || 0) } }),
                  "Forced roll updated",
                );
                e.currentTarget.reset();
              }}
            >
              <Input name="roll_no" type="number" min={0} max={200} placeholder="Roll number" />
              <Button type="submit">Set</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => run(() => forceFn({ data: { roll_no: 0 } }), "Cleared")}
              >
                Clear
              </Button>
            </form>
          </Panel>

          <Panel title="Cycle reports">
            <p className="text-sm text-muted-foreground">
              Download an Excel report per cycle: student, topic, date, period, subject, teacher,
              time taken, rating, review and re-presentation flag.
            </p>
            <div className="mt-4 space-y-2">
              {cycleList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No presentations recorded yet.</p>
              ) : (
                cycleList.map((c) => (
                  <div
                    key={c}
                    className="flex items-center justify-between border-b border-border pb-2 text-sm"
                  >
                    <span>
                      Cycle {c}
                      {c === (data?.cycle ?? 1) ? (
                        <span className="ml-2 text-xs text-muted-foreground">(current)</span>
                      ) : null}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={downloading === c}
                      onClick={() => void downloadReport(c)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {downloading === c ? "Preparing…" : "Download Excel"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Recent presentations">
            <div className="max-h-72 overflow-auto text-sm">
              {(data?.history ?? []).map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between border-b border-border py-2"
                >
                  <span className="tabular-nums">
                    {h.roll_no} · {h.student_name}
                  </span>
                  <span className="text-muted-foreground">
                    Cycle {h.cycle} · {h.rating ? `${h.rating}/5` : "no rating"}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="queue" className="mt-5 space-y-5">
          <Panel title="Add a student to the re-presentation list">
            <p className="text-sm text-muted-foreground">
              The roll number is put back into the current cycle straight away, so the wheel
              can select the student again.
            </p>
            <form
              className="mt-4 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void run(
                  () =>
                    repeatFn({
                      data: {
                        roll_no: Number(f.get("roll_no")),
                        reason: (String(f.get("reason")).trim() || null) as string | null,
                      },
                    }),
                  "Added to the re-presentation list",
                );
                e.currentTarget.reset();
              }}
            >
              <Input
                name="roll_no"
                type="number"
                min={1}
                max={200}
                placeholder="Roll"
                className="w-28"
                required
              />
              <Input name="reason" placeholder="Reason (optional)" maxLength={300} />
              <Button type="submit">Add</Button>
            </form>
          </Panel>

          <Panel title="Re-presentation list">
            {(data?.queue ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">The list is empty.</p>
            ) : (
              <ul className="text-sm">
                {(data?.queue ?? []).map((q) => (
                  <li
                    key={q.id}
                    className="flex items-center justify-between gap-3 border-b border-border py-2"
                  >
                    <span className="tabular-nums">
                      {q.roll_no} · {q.name}
                    </span>
                    <span className="text-muted-foreground">
                      {q.resolved ? "Completed" : "Pending"}
                    </span>
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        run(
                          () => deleteFn({ data: { table: "repeat_queue", id: q.id } }),
                          "Removed from the list",
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

        </TabsContent>
      </Tabs>
      <Footer />
    </main>
  );
}
