import { CountdownTimer } from "@/components/CountdownTimer";
import { DAY_NAMES } from "@/lib/timetable";

export type PresentingStudent = {
  roll_no: number;
  name: string;
  topic: string | null;
  photo_url: string | null;
};

export function PresentationScreen({
  student,
  subject,
  teacher,
  period,
  now,
  running,
  onComplete,
  isRepeat,
}: {
  student: PresentingStudent;
  subject: string;
  teacher: string;
  period: number;
  now: Date;
  running: boolean;
  onComplete: () => void;
  isRepeat: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3 text-sm text-muted-foreground sm:px-10">
        <span className="font-medium text-foreground">{subject}</span>
        <span>{teacher}</span>
        <span>Period {period}</span>
        <span>
          {DAY_NAMES[now.getDay()]}, {now.toLocaleDateString()}
        </span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-8 lg:flex-row lg:gap-16">
        <div className="flex max-w-2xl flex-col items-center gap-4 text-center lg:items-start lg:text-left">
          {isRepeat && (
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-accent">
              Re-presentation
            </span>
          )}
          <div className="flex items-center gap-6">
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={`Photo of ${student.name}`}
                className="h-28 w-28 rounded-full border border-border object-cover"
              />
            ) : null}
            <div className="text-left">
              <p className="text-sm uppercase tracking-wide text-muted-foreground">
                Roll number
              </p>
              <p className="text-[clamp(3rem,8vw,6rem)] font-semibold leading-none tabular-nums">
                {student.roll_no}
              </p>
            </div>
          </div>
          <h1 className="text-[clamp(2rem,5vw,3.75rem)] font-semibold leading-tight">
            {student.name}
          </h1>
          <p className="text-[clamp(1.1rem,2.4vw,1.75rem)] text-muted-foreground">
            {student.topic || "Topic not provided"}
          </p>
        </div>

        <div className="flex flex-col items-center gap-5">
          <CountdownTimer seconds={120} running={running} onComplete={onComplete} />
          <button
            onClick={onComplete}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            End presentation &amp; review
          </button>
        </div>
      </div>
    </div>
  );
}

