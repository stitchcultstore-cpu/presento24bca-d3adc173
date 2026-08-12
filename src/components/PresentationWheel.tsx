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

const RADIUS = 210;

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

  const needleRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"idle" | "fast" | "landing">("idle");
  const [landAngle, setLandAngle] = useState(0);

  // Phase 1: free, fast, constant-speed spin. Phase 2: long dramatic deceleration
  // that ends exactly on the selected roll number.
  useEffect(() => {
    if (!spinning) {
      if (!revealed) {
        setPhase("idle");
        setLandAngle(0);
      }
      return;
    }
    setPhase("fast");
    const t = setTimeout(() => {
      const el = needleRef.current;
      let base = 0;
      if (el) {
        const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
        base = (((Math.atan2(m.b, m.a) * 180) / Math.PI) + 360) % 360;
      }
      const wanted = targetIndex >= 0 ? targetIndex * step : 0;
      const delta = ((wanted - base) % 360 + 360) % 360;
      setLandAngle(base + 360 * 4 + delta);
      setPhase("landing");
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, targetIndex, step]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      <div
        className={cn(
          "absolute inset-6 rounded-full border border-border bg-card shadow-[var(--shadow-card)] transition-shadow duration-500",
          revealed && "border-primary/40 shadow-lg",
        )}
      />
      <div
        ref={needleRef}
        className={cn(
          "absolute inset-0 origin-center",
          phase === "fast" && "animate-[spin_0.65s_linear_infinite]",
          phase === "landing" &&
            "transition-transform duration-[3200ms] ease-[cubic-bezier(0.05,0.72,0.02,1)]",
          phase === "idle" && "transition-transform duration-500",
        )}
        style={phase === "fast" ? undefined : { transform: `rotate(${landAngle}deg)` }}
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
