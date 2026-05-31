/** A map of nutrient key -> amount (per-serving, or a daily total). */
export type NutrientMap = Record<string, number>;

export type TargetDirection = "at_least" | "at_most" | "around";

export type ProgressStatus = "none" | "under" | "on_track" | "met" | "over";

/** Colour-coded band: red → yellow → green → purple. */
export type ProgressZone = "none" | "low" | "moderate" | "good" | "over";

export interface Progress {
  total: number;
  target: number | null;
  ratio: number | null; // total / target
  status: ProgressStatus;
  direction: TargetDirection;
}
