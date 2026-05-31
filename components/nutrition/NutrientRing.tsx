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

export function NutrientRing({
  label,
  unit,
  progress,
  size = 94,
}: {
  label: string;
  unit: string;
  progress: Progress;
  size?: number;
}) {
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ringFraction(progress));

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
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
              ZONE_STROKE[progressZone(progress)],
            )}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tnum font-mono text-[15px] font-medium leading-none text-ink">
            {roundTo(progress.total, progress.total >= 100 ? 0 : 1)}
          </span>
          {progress.target != null && (
            <span className="tnum mt-1 font-mono text-[10px] text-muted">
              /{roundTo(progress.target, progress.target >= 100 ? 0 : 1)}
            </span>
          )}
        </div>
      </div>
      <div className="text-center">
        <p className="text-[11px] font-semibold tracking-wide text-ink">{label}</p>
        <p className="text-[9px] uppercase tracking-[0.16em] text-muted">{unit}</p>
      </div>
    </div>
  );
}
