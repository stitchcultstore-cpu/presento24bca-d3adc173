import { useEffect, useState } from "react";

type Props = {
  seconds: number;
  running: boolean;
  onComplete: () => void;
};

export function CountdownTimer({ seconds, running, onComplete }: Props) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (!running) return;
    if (left <= 0) {
      onComplete();
      return;
    }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left, running, onComplete]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const progress = seconds > 0 ? left / seconds : 0;
  const low = left <= 30;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={
          "font-semibold tabular-nums tracking-tight transition-colors duration-500 text-[clamp(3.5rem,12vw,8rem)] " +
          (low ? "text-destructive" : "text-foreground")
        }
      >
        {mm}:{ss}
      </div>
      <div className="h-1.5 w-64 overflow-hidden rounded-full bg-muted">
        <div
          className={
            "h-full rounded-full transition-[width] duration-1000 ease-linear " +
            (low ? "bg-destructive" : "bg-primary")
          }
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
