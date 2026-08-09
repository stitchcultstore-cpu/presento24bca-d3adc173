import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Pause, Play, RotateCcw } from "lucide-react";

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
  onSaveTopic,
  savingTopic = false,
}: {
  student: PresentingStudent;
  subject: string;
  teacher: string;
  period: number;
  now: Date;
  running: boolean;
  onComplete: (elapsedSeconds: number) => void;
  isRepeat: boolean;
  onSaveTopic?: (topic: string) => void;
  savingTopic?: boolean;
}) {
  const [started, setStarted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [topicDraft, setTopicDraft] = useState("");
  const active = running && started && !paused;
  const elapsed = useRef(0);


  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      elapsed.current += 1;
    }, 1000);
    return () => clearInterval(t);
  }, [active]);

  const handleReset = () => {
    setTimerKey((k) => k + 1);
    elapsed.current = 0;
    setPaused(false);
    setStarted(true);
  };

  const btn =
    "inline-flex items-center gap-2 rounded-lg border-2 border-border px-6 py-3 text-lg font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-35";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-card">
      <header className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-b border-border px-6 py-3 text-center text-base text-muted-foreground sm:px-10">
        <span className="font-medium text-foreground">{subject}</span>
        <span>{teacher}</span>
        <span>Period {period}</span>
        <span suppressHydrationWarning>
          {DAY_NAMES[now.getDay()]}, {now.toLocaleDateString()}
        </span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-6 text-center">
        <div className="flex max-w-4xl flex-col items-center gap-3 text-center">
          {isRepeat && (
            <span className="rounded-full bg-accent/15 px-3 py-1 text-sm font-medium uppercase tracking-wide text-accent">
              Re-presentation
            </span>
          )}
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt={`Photo of ${student.name}`}
              className="h-24 w-24 rounded-full border border-border object-cover"
            />
          ) : null}
          <h1 className="text-[clamp(1.9rem,4.5vw,3.5rem)] font-semibold leading-tight">
            {student.name}
          </h1>
          {student.topic ? (
            <p className="text-[clamp(1rem,2.2vw,1.6rem)] text-muted-foreground">
              {student.topic}
            </p>
          ) : (
            <div className="w-full max-w-2xl">
              <p className="text-sm text-muted-foreground">
                No topic on record — type it below to continue.
              </p>
              <form
                className="mt-3 flex flex-col items-center gap-3 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  const value = topicDraft.trim();
                  if (value.length < 2 || !onSaveTopic) return;
                  onSaveTopic(value);
                }}
              >
                <input
                  value={topicDraft}
                  onChange={(e) => setTopicDraft(e.target.value)}
                  maxLength={300}
                  placeholder="Enter presentation topic"
                  aria-label="Presentation topic"
                  className="h-12 w-full rounded-lg border-2 border-border bg-background px-4 text-lg text-foreground outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={topicDraft.trim().length < 2 || savingTopic}
                  className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-primary px-6 text-lg font-semibold text-primary-foreground disabled:opacity-40"
                >
                  {savingTopic ? "Saving…" : "Save topic"}
                </button>
              </form>
            </div>
          )}

          <div className="flex flex-col items-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Roll number
            </p>
            <p className="text-[clamp(2.2rem,6vw,4.5rem)] font-semibold leading-none tabular-nums text-primary">
              {student.roll_no}
            </p>
          </div>
        </div>

        <CountdownTimer
          key={timerKey}
          seconds={120}
          running={active}
          onComplete={() => onComplete(elapsed.current)}
        />
      </div>

      {/* Timer controls pinned to the bottom of the screen so they stay visible on a TV. */}
      <div className="border-t-2 border-border bg-background px-6 py-5">
        <div className="flex flex-wrap items-center justify-center gap-4">
          {!started || paused ? (
            <button
              onClick={() => {
                setStarted(true);
                setPaused(false);
              }}
              className={btn}
            >
              <Play className="h-5 w-5" /> {paused ? "Resume" : "Start"}
            </button>
          ) : (
            <button onClick={() => setPaused(true)} className={btn}>
              <Pause className="h-5 w-5" /> Pause
            </button>
          )}
          <button onClick={handleReset} className={btn}>
            <RotateCcw className="h-5 w-5" /> Reset
          </button>
          <button
            onClick={() => onComplete(elapsed.current)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <CheckCircle2 className="h-5 w-5" /> Finish &amp; review
          </button>
        </div>
      </div>
    </div>
  );
}
