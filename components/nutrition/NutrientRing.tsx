import { cn } from "@/lib/utils";
import { roundTo } from "@/lib/nutrition/format";
import { ringFraction } from "@/lib/nutrition/math";
import type { Progress } from "@/lib/nutrition/types";

const STATUS_STROKE: Record<Progress["status"], string> = {
  none: "stroke-zinc-300 dark:stroke-zinc-600",
  under: "stroke-amber-500",
  on_track: "stroke-emerald-500",
  met: "stroke-emerald-500",
  over: "stroke-red-500",
};

export function NutrientRing({
  label,
  unit,
  progress,
  size = 92,
}: {
  label: string;
  unit: string;
  progress: Progress;
  size?: number;
}) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ringFraction(progress));

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-black/[.06] dark:stroke-white/10"
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
            className={cn("transition-[stroke-dashoffset]", STATUS_STROKE[progress.status])}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-semibold leading-none">
            {roundTo(progress.total, progress.total >= 100 ? 0 : 1)}
          </span>
          {progress.target != null && (
            <span className="mt-0.5 text-[10px] text-zinc-400">
              / {roundTo(progress.target, progress.target >= 100 ? 0 : 1)}
            </span>
          )}
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
        <p className="text-[10px] text-zinc-400">{unit}</p>
      </div>
    </div>
  );
}
