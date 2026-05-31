import type { NutrientMap, Progress, ProgressZone, TargetDirection } from "./types";

/** Scale a per-serving snapshot by the number of servings eaten. */
export function itemContribution(
  snapshot: NutrientMap,
  quantity: number,
): NutrientMap {
  const out: NutrientMap = {};
  for (const [key, value] of Object.entries(snapshot)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value * quantity;
    }
  }
  return out;
}

/** Sum any number of nutrient maps key-by-key. */
export function sumNutrientMaps(maps: NutrientMap[]): NutrientMap {
  const out: NutrientMap = {};
  for (const map of maps) {
    for (const [key, value] of Object.entries(map)) {
      out[key] = (out[key] ?? 0) + value;
    }
  }
  return out;
}

/** Total nutrients across a day's logged items. */
export function dailyTotals(
  items: Array<{ nutrients_snapshot: NutrientMap; quantity: number }>,
): NutrientMap {
  return sumNutrientMaps(
    items.map((i) => itemContribution(i.nutrients_snapshot, i.quantity)),
  );
}

/** Classify how a day's total measures against a target + its direction. */
export function computeProgress(
  total: number,
  target: number | null,
  direction: TargetDirection,
): Progress {
  if (target == null || target <= 0) {
    return { total, target: target ?? null, ratio: null, status: "none", direction };
  }
  const ratio = total / target;
  let status: Progress["status"];
  switch (direction) {
    case "at_least":
      status = ratio >= 1 ? "met" : "under";
      break;
    case "at_most":
      status = ratio > 1 ? "over" : "on_track";
      break;
    case "around":
    default:
      status = ratio > 1.1 ? "over" : ratio < 0.9 ? "under" : "on_track";
      break;
  }
  return { total, target, ratio, status, direction };
}

/**
 * Colour band for a progress value:
 *   red (low) → yellow (moderate) → green (good) → purple (too much, 120%+).
 * Direction-aware: for "at_most" limits, low is good and over the cap is the
 * problem, so the scale flips.
 */
export function progressZone(progress: Progress): ProgressZone {
  const { ratio, target, direction } = progress;
  if (ratio == null || target == null) return "none";

  if (direction === "at_most") {
    if (ratio > 1) return "over"; // over the limit — too much
    if (ratio >= 0.85) return "moderate"; // nearing the cap
    return "good"; // comfortably under
  }

  // at_least / around — filling toward the target
  if (ratio >= 1.2) return "over"; // too much
  if (ratio >= 0.85) return "good"; // at / near target
  if (ratio >= 0.5) return "moderate"; // moderate
  return "low"; // really low
}

/** Fraction 0..1 for a ring arc (caps at 1 for display). */
export function ringFraction(progress: Progress): number {
  if (progress.ratio == null) return 0;
  return Math.max(0, Math.min(1, progress.ratio));
}
