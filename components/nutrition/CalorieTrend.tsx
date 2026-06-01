import { cn } from "@/lib/utils";
import { calorieStatus, calorieZone } from "@/lib/nutrition/math";
import type { ProgressZone } from "@/lib/nutrition/types";

const ZONE_BAR: Record<ProgressZone, string> = {
  none: "bg-leaf",
  low: "bg-low",
  moderate: "bg-mod",
  good: "bg-good",
};

interface Day {
  date: string;
  kcal: number;
}

function shortDate(iso: string) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** 14-day calorie bars, coloured by the zone palette (red→yellow→green→purple). */
export function CalorieTrend({ days, target }: { days: Day[]; target: number | null }) {
  const peak = Math.max(target ?? 0, ...days.map((d) => d.kcal), 1);
  const max = peak * 1.15;
  const targetPct = target ? (target / max) * 100 : null;

  const logged = days.filter((d) => d.kcal > 0);
  const avg = logged.length
    ? Math.round(logged.reduce((s, d) => s + d.kcal, 0) / logged.length)
    : 0;
  const onTrack = target
    ? days.filter((d) => d.kcal > 0 && calorieStatus(d.kcal, target) === "on_track").length
    : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">Calories · 14 days</p>
        <p className="text-xs text-muted">
          avg <span className="tnum font-mono text-ink">{avg}</span> kcal
        </p>
      </div>

      <div className="relative h-32">
        {targetPct != null && (
          <>
            <div
              className="absolute inset-x-0 border-t border-dashed border-ink/25"
              style={{ bottom: `${targetPct}%` }}
            />
            <span
              className="absolute right-0 -translate-y-1/2 rounded bg-surface px-1 text-[9px] text-muted"
              style={{ bottom: `${targetPct}%` }}
            >
              {target}
            </span>
          </>
        )}
        <div className="flex h-full items-end gap-[3px]">
          {days.map((d, i) => {
            const empty = d.kcal <= 0;
            const zone = target != null ? calorieZone(d.kcal, target) : "none";
            const h = Math.max(2, (d.kcal / max) * 100);
            return (
              <div
                key={i}
                title={`${shortDate(d.date)}: ${Math.round(d.kcal)} kcal`}
                className={cn(
                  "flex-1 rounded-t-[3px] transition-all",
                  empty ? "bg-ink/[0.07]" : ZONE_BAR[zone],
                  i === days.length - 1 && !empty && "ring-1 ring-inset ring-ink/25",
                )}
                style={{ height: empty ? "3px" : `${h}%` }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted">
        <span>{shortDate(days[0]?.date ?? "")}</span>
        {target != null && (
          <span>
            <span className="tnum font-mono text-ink">{onTrack}</span>/{days.length} on track
          </span>
        )}
        <span>Today</span>
      </div>
    </div>
  );
}
