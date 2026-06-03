import { cn } from "@/lib/utils";
import type { ProgressZone } from "@/lib/nutrition/types";

// Soft tinted status pill — full literal class names so Tailwind emits them.
const ZONE_CHIP: Record<ProgressZone, string> = {
  none: "bg-ink/[0.05] text-muted",
  low: "bg-low/15 text-low",
  moderate: "bg-mod/15 text-mod",
  good: "bg-good/15 text-good",
};

const ZONE_DOT: Record<ProgressZone, string> = {
  none: "bg-muted",
  low: "bg-low",
  moderate: "bg-mod",
  good: "bg-good",
};

/** Small-caps calorie status pill: tinted background + matching status dot. */
export function CalorieStatusPill({
  zone,
  label,
  className,
}: {
  zone: ProgressZone;
  label: string;
  className?: string;
}) {
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "text-[0.62rem] font-semibold uppercase tracking-[0.16em]",
        ZONE_CHIP[zone],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", ZONE_DOT[zone])} />
      {label}
    </span>
  );
}
