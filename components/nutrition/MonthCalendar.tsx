import { cn } from "@/lib/utils";
import type { ProgressZone } from "@/lib/nutrition/types";
import type { CalendarDay } from "@/lib/data/profileStats";

// Static class names — Tailwind v4 only emits classes it sees literally.
// Note the enum value is `moderate` while the token is `--color-mod`.
const ZONE_BG: Record<ProgressZone, string> = {
  none: "bg-leaf/15 text-ink", // logged, but no calorie target to grade against
  low: "bg-low/85 text-cream",
  moderate: "bg-mod/85 text-cream",
  good: "bg-good/85 text-cream",
  over: "bg-over/85 text-cream",
};

const WEEKDAYS_MON = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WEEKDAYS_SUN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const LEGEND: { zone: ProgressZone; label: string }[] = [
  { zone: "low", label: "low" },
  { zone: "moderate", label: "mod" },
  { zone: "good", label: "good" },
  { zone: "over", label: "over" },
];

/** Static month heatmap: each logged day tinted by its calorie zone. */
export function MonthCalendar({
  monthLabel,
  weekdayStart = "mon",
  leadingBlanks,
  days,
}: {
  monthLabel: string;
  weekdayStart?: "mon" | "sun";
  leadingBlanks: number;
  days: CalendarDay[];
}) {
  const weekdays = weekdayStart === "mon" ? WEEKDAYS_MON : WEEKDAYS_SUN;
  const blanks = weekdayStart === "mon" ? leadingBlanks : (leadingBlanks + 1) % 7;

  return (
    <section className="space-y-4 rounded-3xl border border-line bg-surface/50 p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{monthLabel}</p>
        <div className="flex items-center gap-2">
          {LEGEND.map(({ zone, label }) => (
            <span key={zone} className="flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full", ZONE_BG[zone].split(" ")[0])} />
              <span className="text-[9px] uppercase tracking-[0.14em] text-muted">{label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] uppercase tracking-[0.12em] text-muted">
        {weekdays.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: blanks }).map((_, i) => (
          <div key={`blank-${i}`} aria-hidden />
        ))}
        {days.map((d) => (
          <div
            key={d.iso}
            title={`${d.iso}: ${Math.round(d.kcal)} kcal`}
            className={cn(
              "flex aspect-square items-center justify-center rounded-xl font-mono text-[11px] tabular-nums",
              d.logged ? ZONE_BG[d.zone] : "bg-ink/[0.04] text-muted",
              d.isToday && "ring-2 ring-inset ring-ink/40",
            )}
          >
            {d.day}
          </div>
        ))}
      </div>
    </section>
  );
}
