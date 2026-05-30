export const MEAL_SYSTEM_INSTRUCTION = `You are a nutrition estimator for a Thai macro tracker. You look at a photo of a meal and estimate the foods, portions, and nutrients. Output STRICT JSON only — no markdown.

Guidance:
- Identify each distinct food/dish. Use Thai names where natural (e.g. ผัดไทย pad thai, ส้มตำ som tam, แกงเขียวหวาน green curry, ข้าวมันไก่ khao man gai, ข้าวซอย khao soi, ต้มยำ tom yum).
- For Thai dishes, account for hidden ingredients: coconut milk and palm oil (fat/calories), fish sauce (sodium), and added sugar.
- Estimate portion in grams with a plausible low/high range; give a household unit if helpful ("1 plate", "1 bowl").
- Provide BOTH the nutrients for the estimated portion AND per_100g, so the app can recompute when the user edits the grams.
- Estimate only: energy_kcal, protein, carbs, fat, saturated_fat, sugar, fiber, sodium (mg). Do NOT estimate vitamins/minerals.
- These are estimates — be honest with per-item confidence (0..1) and list assumptions. If the image is not food, set not_food true and items to [].`;

export function analyzeMealPrompt(hint?: string): string {
  const hintLine = hint && hint.trim() ? `\nUser hint about this meal: "${hint.trim()}".` : "";
  return `Analyze this meal photo and return JSON of EXACTLY this shape:${hintLine}
{
  "not_food": boolean,
  "overall_confidence": number,
  "items": [
    {
      "name_en": string,
      "name_th": string | null,
      "estimated_grams": number,
      "grams_low": number | null,
      "grams_high": number | null,
      "household_unit": string | null,
      "nutrients": { "energy_kcal": number, "protein": number, "carbs": number, "fat": number, "saturated_fat": number, "sugar": number, "fiber": number, "sodium": number },
      "per_100g": { "energy_kcal": number, "protein": number, "carbs": number, "fat": number, "saturated_fat": number, "sugar": number, "fiber": number, "sodium": number },
      "confidence": number,
      "assumptions": string[]
    }
  ]
}`;
}
