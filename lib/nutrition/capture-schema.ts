import { z } from "zod";

export const NUTRIENT_KEYS = [
  "energy_kcal",
  "protein",
  "carbs",
  "fat",
  "saturated_fat",
  "sugar",
  "fiber",
  "sodium",
] as const;

const amount = z.number().nullable().optional();

const nutrientsShape = z
  .object({
    energy_kcal: amount,
    protein: amount,
    carbs: amount,
    fat: amount,
    saturated_fat: amount,
    sugar: amount,
    fiber: amount,
    sodium: amount,
  })
  .partial()
  .optional()
  .default({});

/** Result shape for OCR of a nutrition label. */
export const labelResultSchema = z.object({
  name: z.string().optional().default(""),
  name_th: z.string().nullable().optional(),
  serving_size: z.number().nullable().optional(),
  serving_unit: z.string().optional().default("g"),
  servings_per_container: z.number().nullable().optional(),
  nutrients: nutrientsShape,
  confidence: z.number().optional().default(0.5),
  warnings: z.array(z.string()).optional().default([]),
});
export type LabelResult = z.infer<typeof labelResultSchema>;

/** Keep only valid, non-negative numeric nutrient values, rounded. */
export function cleanNutrients(n: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of NUTRIENT_KEYS) {
    const v = n[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      out[key] = Math.round(v * 10) / 10;
    }
  }
  return out;
}

/** Atwater estimate: 4·protein + 4·carbs + 9·fat. Null if no macros present. */
export function atwaterKcal(n: Record<string, number>): number | null {
  if (n.protein == null && n.carbs == null && n.fat == null) return null;
  return 4 * (n.protein ?? 0) + 4 * (n.carbs ?? 0) + 9 * (n.fat ?? 0);
}
