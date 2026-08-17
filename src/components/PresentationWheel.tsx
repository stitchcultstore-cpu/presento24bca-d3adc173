import { cn } from "@/lib/utils";

export type RollState = "available" | "presented" | "absent" | "selected";

type Props = {
  rolls: number[];
  stateOf: (roll: number) => RollState;
  /** Angle-locked target; the needle lands here after the spin. */
  target: number | null;
  spinning: boolean;
  /** Only true once the wheel has fully stopped — gates the number reveal. */
  revealed?: boolean;
};

/** Radius as a percentage of the wheel box so it scales on every screen size. */
const RADIUS_PCT = 40.5;

export function PresentationWheel({
  rolls,
  stateOf,
  target,
  spinning,
  revealed = false,
}: Props) {
  const count = rolls.length || 1;
  const step = 360 / count;
  const targetIndex = target ? rolls.indexOf(target) : -1;
  const needleAngle =
    targetIndex >= 0 ? 360 * 6 + targetIndex * step : spinning ? 360 * 6 : 0;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(90vw,520px)]">
      <div
        className={cn(
          "absolute inset-6 rounded-full border border-border bg-card shadow-[var(--shadow-card)] transition-shadow duration-500",
          revealed && "border-primary/40 shadow-lg",
        )}
      />
      <div
        className="absolute inset-0 origin-center transition-transform duration-[4200ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: `rotate(${needleAngle}deg)` }}
      >
        <div className="absolute left-1/2 top-1/2 h-[42%] w-[3px] -translate-x-1/2 -translate-y-full rounded-full bg-primary" />
      </div>
      <div
        className={cn(
          "absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-center transition-all duration-500",
          revealed
            ? "scale-110 border-primary bg-primary text-primary-foreground"
            : "border-border",
        )}
      >
        {revealed ? (
          <span className="animate-scale-in text-2xl font-semibold tabular-nums">
            {target}
          </span>
        ) : spinning ? (
          <span className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
          </span>
        ) : (
          <span className="text-2xl font-semibold text-muted-foreground">—</span>
        )}
      </div>

      {rolls.map((roll, i) => {
        const angle = (i * step - 90) * (Math.PI / 180);
        const state = stateOf(roll);
        return (
          <div
            key={roll}
            className={cn(
              "absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-medium tabular-nums transition-all duration-300",
              state === "available" && "border-border bg-card text-foreground",
              state === "presented" &&
                "border-border bg-muted text-muted-foreground line-through opacity-60",
              state === "absent" &&
                "border-destructive/30 bg-destructive/10 text-destructive line-through opacity-70",
              state === "selected" &&
                "scale-125 border-primary bg-primary text-primary-foreground shadow-md",
              spinning && "opacity-70",
            )}
            style={{
              left: `calc(50% + ${Math.cos(angle) * RADIUS}px)`,
              top: `calc(50% + ${Math.sin(angle) * RADIUS}px)`,
            }}
          >
            {roll}
          </div>
        );
      })}
    </div>
  );
}
