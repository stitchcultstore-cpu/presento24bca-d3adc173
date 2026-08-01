import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarDays, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { SessionMeta } from "@/components/SessionMeta";
import { getSessionData } from "@/lib/presento.functions";
import { DAY_NAMES, formatTime, resolveCurrentSession } from "@/lib/timetable";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Presento — Classroom Presentation Sessions" },
      {
        name: "description",
        content:
          "Presento runs daily classroom presentation sessions: today's timetable period, absentees, the roll-number wheel and teacher reviews.",
      },
      { property: "og:title", content: "Presento — Classroom Presentation Sessions" },
      {
        property: "og:description",
        content:
          "Today's presentation session, resolved automatically from the department timetable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Home() {
  const now = useClock();
  const fetchData = useServerFn(getSessionData);
  const { data, isLoading } = useQuery({
    queryKey: ["session-data"],
    queryFn: () => fetchData(),
  });

  const resolved = data ? resolveCurrentSession(data.timetable, now) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-10 sm:px-8">
      <header className="flex items-baseline justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Presento</h1>
          <p className="text-sm text-muted-foreground">
            Student Presentation Management System
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div className="flex items-center justify-end gap-1.5" suppressHydrationWarning>
            <CalendarDays className="h-3.5 w-3.5" />
            {DAY_NAMES[now.getDay()]}, {now.toLocaleDateString()}
          </div>
          <div
            className="flex items-center justify-end gap-1.5 tabular-nums"
            suppressHydrationWarning
          >
            <Clock className="h-3.5 w-3.5" />
            {now.toLocaleTimeString()}
          </div>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Today's presentation session
        </h2>

        <div className="mt-3 rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          {isLoading || !resolved ? (
            <p className="text-sm text-muted-foreground">Loading timetable…</p>
          ) : resolved.status === "active" ? (
            <>
              <SessionMeta entry={resolved.entry} now={now} />
              <div className="mt-7 border-t border-border pt-6">
                <Button asChild size="lg">
                  <Link to="/session">Start presentation session</Link>
                </Button>
              </div>
            </>
          ) : resolved.status === "upcoming" ? (
            <div className="space-y-1.5">
              <p className="text-base font-medium">No active presentation session.</p>
              <p className="text-sm text-muted-foreground">
                Next class starts at {formatTime(resolved.entry.start_time)} —{" "}
                {resolved.entry.subject} (Period {resolved.entry.period},{" "}
                {resolved.entry.department} · Sem {resolved.entry.semester} ·{" "}
                {resolved.entry.section}).
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-base font-medium">No active presentation session.</p>
              <p className="text-sm text-muted-foreground">
                {data && data.timetable.length === 0
                  ? "No timetable has been configured yet."
                  : "There are no further classes scheduled today."}
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="mt-auto pt-10 text-xs text-muted-foreground">
        Cycle {data?.cycle ?? 1} · {data?.students.length ?? 0} students on the roster
      </div>
      <Footer />
    </main>
  );
}
