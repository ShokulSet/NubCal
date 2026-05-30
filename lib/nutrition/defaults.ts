import type { TargetDirection } from "./types";

export interface DefaultNutrient {
  key: string;
  display_name: string;
  unit: string;
  kind: "energy" | "macro" | "micro" | "other";
  is_energy: boolean;
  sort_order: number;
}

/** Core macros seeded for every user; extras (sugar, fiber, sodium…) can be added. */
export const DEFAULT_NUTRIENTS: DefaultNutrient[] = [
  { key: "energy_kcal", display_name: "Calories", unit: "kcal", kind: "energy", is_energy: true, sort_order: 0 },
  { key: "protein", display_name: "Protein", unit: "g", kind: "macro", is_energy: false, sort_order: 10 },
  { key: "carbs", display_name: "Carbs", unit: "g", kind: "macro", is_energy: false, sort_order: 20 },
  { key: "fat", display_name: "Fat", unit: "g", kind: "macro", is_energy: false, sort_order: 30 },
];

/** Sensible default goal direction per seeded nutrient. */
export const DEFAULT_DIRECTION: Record<string, TargetDirection> = {
  energy_kcal: "around",
  protein: "at_least",
  carbs: "around",
  fat: "around",
  saturated_fat: "at_most",
  sugar: "at_most",
  fiber: "at_least",
  sodium: "at_most",
};

export const UNIT_OPTIONS = ["g", "mg", "mcg", "kcal", "IU", "%"] as const;
export const KIND_OPTIONS = ["energy", "macro", "micro", "other"] as const;

/** Turn a user-entered nutrient name into a stable key slug. */
export function slugifyNutrientKey(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "nutrient"
  );
}
