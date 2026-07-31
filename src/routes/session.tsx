import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SessionMeta } from "@/components/SessionMeta";
import { PresentationWheel, type RollState } from "@/components/PresentationWheel";
import { PresentationScreen } from "@/components/PresentationScreen";
import { ReviewForm } from "@/components/ReviewForm";
import {
  getSessionData,
  pickNextRoll,
  recordPresentation,
  submitReview,
} from "@/lib/presento.functions";
import { parseAbsentRolls, resolveCurrentSession } from "@/lib/timetable";

export const Route = createFileRoute("/session")({
  head: () => ({
    meta: [
      { title: "Presentation Session — Presento" },
      {
        name: "description",
        content:
          "Mark absentees, spin the roll-number wheel, run the two-minute presentation timer and record the teacher review.",
      },
      { property: "og:title", content: "Presentation Session — Presento" },
      {
        property: "og:description",
        content: "Run today's classroom presentation session from start to review.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SessionPage,
});

type Stage = "absent" | "wheel" | "screen" | "review";

function SessionPage() {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useServerFn(getSessionData);
  const pick = useServerFn(pickNextRoll);
  const record = useServerFn(recordPresentation);
  const review = useServerFn(submitReview);

  const { data, refetch } = useQuery({
    queryKey: ["session-data"],
    queryFn: () => fetchData(),
  });

  const [stage, setStage] = useState<Stage>("absent");
  const [absentInput, setAbsentInput] = useState("");
  const [absent, setAbsent] = useState<number[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<{
    roll_no: number;
    name: string;
    topic: string | null;
    photo_url: string | null;
  } | null>(null);
  const [kind, setKind] = useState<"original" | "repeat">("original");
  const [presentationId, setPresentationId] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);

  const resolved = data ? resolveCurrentSession(data.timetable, now) : null;
  const entry = resolved?.status === "active" ? resolved.entry : null;

  const rolls = useMemo(
    () => (data?.students ?? []).map((s) => s.roll_no).sort((a, b) => a - b),
    [data],
  );
  const presented = new Set(data?.presentedRolls ?? []);
  const remaining = rolls.filter((r) => !presented.has(r) && !absent.includes(r)).length;

  const stateOf = useCallback(
    (roll: number): RollState => {
      if (selected?.roll_no === roll && revealed) return "selected";
      if (absent.includes(roll)) return "absent";
      if (presented.has(roll)) return "presented";
      return "available";
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, revealed, absent, data?.presentedRolls],
  );

  const spin = useMutation({
    mutationFn: async () => pick({ data: { absent } }),
    onSuccess: async (result) => {
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      setKind(result.kind);
      setRevealed(false);
      setSpinning(true);
      setSelected(result.student);
      setTimeout(async () => {
        setSpinning(false);
        setRevealed(true);
        const created = await record({
          data: {
            roll_no: result.student.roll_no,
            kind: result.kind,
            cycle: result.cycle,
            subject: entry?.subject ?? null,
            teacher: entry?.teacher ?? null,
            period: entry?.period ?? null,
          },
        });
        setPresentationId(created.id);
        setTimeout(() => {
          setStage("screen");
          setTimerRunning(true);
        }, 1800);
      }, 4400);
    },
    onError: () => toast.error("Could not select a roll number."),
  });

  const saveReview = useMutation({
    mutationFn: async (value: { review: string; rating: number; needsRepeat: boolean }) =>
      review({
        data: {
          id: presentationId!,
          review: value.review,
          rating: value.rating,
          needs_repeat: value.needsRepeat,
        },
      }),
    onSuccess: async () => {
      toast.success("Review saved");
      setStage("wheel");
      setSelected(null);
      setPresentationId(null);
      await refetch();
      router.invalidate();
    },
    onError: () => toast.error("Could not save the review."),
  });

  if (!entry) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
          <h1 className="text-lg font-semibold">No active presentation session.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A session can only be conducted during a scheduled period.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      <section className="mt-5 rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <SessionMeta entry={entry} now={now} compact />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-sm font-medium">Absent roll numbers</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter comma-separated roll numbers, e.g. 4, 8, 17, 29
            </p>
            <div className="mt-3 space-y-3">
              <Label htmlFor="absent" className="sr-only">
                Absent roll numbers
              </Label>
              <Input
                id="absent"
                value={absentInput}
                maxLength={300}
                disabled={stage !== "absent"}
                onChange={(e) => setAbsentInput(e.target.value)}
                placeholder="4, 8, 17, 29"
              />
              {stage === "absent" ? (
                <Button
                  className="w-full"
                  onClick={() => {
                    setAbsent(parseAbsentRolls(absentInput, Math.max(...rolls, 55)));
                    setStage("wheel");
                  }}
                >
                  Confirm absentees
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setStage("absent")}
                  disabled={stage !== "wheel"}
                >
                  Edit absentees
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <dl className="space-y-3 text-sm">
              <div className="flex items-baseline justify-between">
                <dt className="text-muted-foreground">Remaining students</dt>
                <dd className="font-medium tabular-nums">{remaining}</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-muted-foreground">Absent today</dt>
                <dd className="font-medium tabular-nums">{absent.length}</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-muted-foreground">Presentation cycle</dt>
                <dd className="font-medium tabular-nums">{data?.cycle ?? 1}</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-muted-foreground">Re-presentation queue</dt>
                <dd className="font-medium tabular-nums">
                  {data?.repeatQueue.length ?? 0}
                </dd>
              </div>
            </dl>
          </div>
        </aside>

        <section className="rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          {stage === "absent" ? (
            <p className="py-24 text-center text-sm text-muted-foreground">
              Confirm the absent roll numbers to enable the presentation wheel.
            </p>
          ) : (
            <>
              <PresentationWheel
                rolls={rolls}
                stateOf={stateOf}
                target={selected?.roll_no ?? null}
                spinning={spinning}
                revealed={revealed}
              />
              {revealed && selected ? (
                <div className="mt-6 animate-fade-in text-center">
                  <p className="text-xl font-semibold">{selected.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.topic || "Topic not provided"}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                    Roll number
                  </p>
                  <p className="text-4xl font-semibold tabular-nums text-primary">
                    {selected.roll_no}
                  </p>
                </div>
              ) : (
                <div className="mt-6 flex justify-center">
                  <Button
                    size="lg"
                    disabled={spinning || spin.isPending || remaining === 0}
                    onClick={() => spin.mutate()}
                  >
                    {spinning ? "Spinning…" : "Spin the wheel"}
                  </Button>
                </div>
              )}
        </section>
      </div>

      {stage === "screen" && selected && (
        <PresentationScreen
          student={selected}
          subject={entry.subject}
          teacher={entry.teacher}
          period={entry.period}
          now={now}
          running={timerRunning}
          isRepeat={kind === "repeat"}
          onComplete={() => {
            setTimerRunning(false);
            setStage("review");
          }}
        />
      )}

      <Dialog open={stage === "review"}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Presentation review</DialogTitle>
          </DialogHeader>
          {selected && (
            <ReviewForm
              studentName={selected.name}
              rollNo={selected.roll_no}
              submitting={saveReview.isPending}
              onSubmit={(value) => saveReview.mutate(value)}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
