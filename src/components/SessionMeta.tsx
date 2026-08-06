import { DAY_NAMES, effectiveDay, formatTime, type TimetableEntry } from "@/lib/timetable";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="truncate text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function SessionMeta({
  entry,
  now,
  compact = false,
  overrideDay = null,
}: {
  entry: TimetableEntry;
  now: Date;
  compact?: boolean;
  overrideDay?: number | null;
}) {
  const day = effectiveDay(now, overrideDay);
  const overridden = overrideDay != null && overrideDay !== now.getDay();

  return (
    <dl
      className={
        "grid gap-x-6 gap-y-4 " +
        (compact
          ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-8"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")
      }
    >
      <Field label="Date" value={now.toLocaleDateString()} />
      <Field
        label="Day"
        value={DAY_NAMES[day] + (overridden ? " (override)" : "")}
      />
      <Field
        label="Period"
        value={`Period ${entry.period} · ${formatTime(entry.start_time)}–${formatTime(entry.end_time)}`}
      />
      <Field label="Subject" value={entry.subject} />
      <Field label="Teacher" value={entry.teacher} />
      <Field label="Department" value={entry.department} />
      <Field label="Semester" value={entry.semester} />
      <Field label="Section" value={entry.section} />
    </dl>
  );
}
