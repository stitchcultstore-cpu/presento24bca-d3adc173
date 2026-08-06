export type TimetableEntry = {
  id: string;
  day_of_week: number;
  period: number;
  start_time: string;
  end_time: string;
  subject: string;
  teacher: string;
  department: string;
  semester: string;
  section: string;
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

export function formatTime(time: string): string {
  const mins = toMinutes(time);
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export type ResolvedSession =
  | { status: "active"; entry: TimetableEntry }
  | { status: "upcoming"; entry: TimetableEntry }
  | { status: "none" };

/** The weekday the app should behave as: an admin override, else the real day. */
export function effectiveDay(now: Date, overrideDay?: number | null): number {
  return overrideDay != null && overrideDay >= 0 && overrideDay <= 6
    ? overrideDay
    : now.getDay();
}

/** Resolves the class happening right now from the timetable and system clock. */
export function resolveCurrentSession(
  entries: TimetableEntry[],
  now: Date,
  overrideDay?: number | null,
): ResolvedSession {
  const day = effectiveDay(now, overrideDay);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = entries
    .filter((e) => e.day_of_week === day)
    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));

  const active = today.find(
    (e) => minutes >= toMinutes(e.start_time) && minutes < toMinutes(e.end_time),
  );
  if (active) return { status: "active", entry: active };

  const next = today.find((e) => toMinutes(e.start_time) > minutes);
  if (next) return { status: "upcoming", entry: next };

  return { status: "none" };
}


export function parseAbsentRolls(input: string, max: number): number[] {
  return Array.from(
    new Set(
      input
        .split(/[\s,;]+/)
        .map((v) => Number(v.trim()))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= max),
    ),
  ).sort((a, b) => a - b);
}
