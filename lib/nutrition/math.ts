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
 * Colour band for a nutrient (NOT calories — those use calorieZone):
 *   red (low) → amber (moderate) → green (good).
 * Overshooting a macro target isn't a concern, so there's no "too much" band —
 * anything at/above the target reads green. For "at_most" limits the scale
 * flips: comfortably under is good, and exceeding the cap is flagged red.
 */
export function progressZone(progress: Progress): ProgressZone {
  const { ratio, target, direction } = progress;
  if (ratio == null || target == null) return "none";

  if (direction === "at_most") {
    if (ratio > 1) return "low"; // over the cap — the problem
    if (ratio >= 0.85) return "moderate"; // nearing the cap
    return "good"; // comfortably under
  }

  // at_least / around — filling toward the target; over the goal is still good.
  if (ratio >= 0.85) return "good"; // at / near / above target
  if (ratio >= 0.5) return "moderate";
  return "low"; // really low
}

/** Fraction 0..1 for a ring arc (caps at 1 for display). */
export function ringFraction(progress: Progress): number {
  if (progress.ratio == null) return 0;
  return Math.max(0, Math.min(1, progress.ratio));
}

/**
 * Calorie-specific grade. Calories are the app's headline number, so they're
 * judged by the absolute kcal surplus (actual − target), not the ratio bands
 * used for macros. Five states, mapped to a green/amber/red palette (no purple).
 */
export type CalorieStatus =
  | "none"
  | "on_track"
  | "slight_over"
  | "too_much"
  | "slight_under"
  | "too_low";

export function calorieStatus(total: number, target: number | null): CalorieStatus {
  if (target == null || target <= 0) return "none";
  const surplus = total - target;
  if (surplus > 500) return "too_much";
  if (surplus > 300) return "slight_over";
  if (surplus >= -100) return "on_track";
  if (surplus >= -300) return "slight_under";
  return "too_low";
}

/** Calorie surplus status → existing colour zone (green/amber/red, never purple). */
export function calorieZone(total: number, target: number | null): ProgressZone {
  switch (calorieStatus(total, target)) {
    case "on_track":
      return "good";
    case "slight_over":
    case "slight_under":
      return "moderate";
    case "too_much":
    case "too_low":
      return "low";
    default:
      return "none";
  }
}

/** Short status labels — rendered small-caps in the UI, so casing is cosmetic. */
export const CALORIE_STATUS: Record<CalorieStatus, string> = {
  none: "",
  on_track: "On track",
  slight_over: "Slight overage",
  too_much: "Too much",
  slight_under: "Slight deficit",
  too_low: "Too low",
};
