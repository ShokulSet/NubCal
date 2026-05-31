import { cn } from "@/lib/utils";
import { roundTo } from "@/lib/nutrition/format";
import { ringFraction, progressZone } from "@/lib/nutrition/math";
import type { Progress, ProgressZone } from "@/lib/nutrition/types";

const ZONE_STROKE: Record<ProgressZone, string> = {
  none: "stroke-ink/15",
  low: "stroke-low",
  moderate: "stroke-mod",
  good: "stroke-good",
  over: "stroke-over",
};

/** Full-width hero for the calorie target: big ring + remaining/over. */
export function CalorieHero({ progress }: { progress: Progress }) {
  const size = 118;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ringFraction(progress));

  const total = roundTo(progress.total, 0);
  const target = progress.target != null ? roundTo(progress.target, 0) : null;
  const delta = progress.target != null ? Math.round(progress.target - progress.total) : null;
  const zone = progressZone(progress);

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-ink/10"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(
              "transition-[stroke-dashoffset] duration-500",
              ZONE_STROKE[zone],
            )}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tnum font-mono text-2xl font-medium leading-none text-ink">
            {total}
          </span>
          {target != null && (
            <span className="tnum mt-1 font-mono text-[11px] text-muted">/ {target}</span>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="eyebrow">Calories</p>
        {delta == null ? (
          <p className="mt-1 text-2xl font-semibold text-ink">
            {total}
            <span className="ml-1 text-sm font-normal text-muted">kcal</span>
          </p>
        ) : delta >= 0 ? (
          <p className="mt-1 text-2xl font-semibold text-ink">
            {delta}
            <span className="ml-1 text-sm font-normal text-muted">kcal left</span>
          </p>
        ) : (
          <p className={cn("mt-1 text-2xl font-semibold", zone === "over" ? "text-over" : "text-chili")}>
            {Math.abs(delta)}
            <span className="ml-1 text-sm font-normal">kcal over</span>
          </p>
        )}
        <p className="mt-1 tnum font-mono text-xs text-muted">
          {total} / {target ?? "—"} kcal
        </p>
      </div>
    </div>
  );
}
