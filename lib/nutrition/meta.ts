/** Display label + unit for the standard nutrient keys (client-safe). */
export const NUTRIENT_META: Record<string, { label: string; unit: string }> = {
  energy_kcal: { label: "Calories", unit: "kcal" },
  protein: { label: "Protein", unit: "g" },
  carbs: { label: "Carbs", unit: "g" },
  fat: { label: "Fat", unit: "g" },
  saturated_fat: { label: "Saturated fat", unit: "g" },
  sugar: { label: "Sugar", unit: "g" },
  fiber: { label: "Fiber", unit: "g" },
  sodium: { label: "Sodium", unit: "mg" },
};

export const NUTRIENT_ORDER = [
  "energy_kcal",
  "protein",
  "carbs",
  "fat",
  "saturated_fat",
  "sugar",
  "fiber",
  "sodium",
] as const;
