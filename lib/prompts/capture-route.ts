import { MEAL_SYSTEM_INSTRUCTION, analyzeMealPrompt } from "./analyze-meal";
import { OCR_SYSTEM_INSTRUCTION, ocrLabelPrompt } from "./ocr-label";

/**
 * One photo, one Gemini call: classify the image as a packaged nutrition LABEL,
 * a prepared MEAL, or NOT_FOOD, and extract the matching structure. The system
 * instruction reuses the existing OCR and meal rules verbatim so each branch
 * behaves exactly like the standalone /api/labels/ocr and /api/meals/analyze
 * routes — we only add a routing preamble on top.
 */
const ROUTING_PREAMBLE = `You get ONE photo. Decide type: 'label' (a packaged product's printed nutrition facts), 'meal' (cooked food/dish(es)), or 'not_food'. Output STRICT JSON only.`;

export function captureRouteSystemInstruction(): string {
  return `${ROUTING_PREAMBLE}

Pick the single best type, then fill ONLY the matching key of the output ('label' for type "label", 'meal' for type "meal", both null for "not_food"). Follow the matching section's rules exactly.

=== IF IT IS A PACKAGED NUTRITION LABEL ===
${OCR_SYSTEM_INSTRUCTION}

=== IF IT IS A PREPARED MEAL / DISH(ES) ===
${MEAL_SYSTEM_INSTRUCTION}`;
}

/**
 * The prompt embeds the SAME object shapes the standalone prompt builders
 * specify (via ocrLabelPrompt / analyzeMealPrompt), so the model returns
 * sub-objects the existing labelResultSchema / mealResultSchema accept. The
 * optional hint applies only to the meal branch (same semantics as
 * analyzeMealPrompt's hint).
 */
export function captureRoutePrompt(hint?: string): string {
  return `Look at this photo, classify it, and return JSON of EXACTLY this shape:
{
  "type": "label" | "meal" | "not_food",
  "label": <the label object below, or null>,
  "meal": <the meal object below, or null>
}

Fill ONLY the key that matches "type"; set the other to null. For "not_food", set both "label" and "meal" to null.

--- The "label" object must match this shape (only when type is "label"): ---
${ocrLabelPrompt()}

--- The "meal" object must match this shape (only when type is "meal"): ---
${analyzeMealPrompt(hint)}`;
}
