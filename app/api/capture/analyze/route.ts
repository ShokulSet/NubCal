import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateJson } from "@/lib/gcp/gemini";
import {
  captureRouteSystemInstruction,
  captureRoutePrompt,
} from "@/lib/prompts/capture-route";
import {
  labelResultSchema,
  mealResultSchema,
  cleanNutrients,
  atwaterKcal,
  reconcileEnergy,
} from "@/lib/nutrition/capture-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * One photo → one Vertex call that BOTH classifies and extracts. Routes to a
 * label result (mirrors /api/labels/ocr) or a meal result (mirrors
 * /api/meals/analyze); anything else returns not_food.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { imageBase64?: string; mimeType?: string; hint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!body.imageBase64) {
    return NextResponse.json({ error: "missing image" }, { status: 400 });
  }

  try {
    const { data, model } = await generateJson<{
      type?: string;
      label?: unknown;
      meal?: unknown;
    }>({
      prompt: captureRoutePrompt(body.hint),
      systemInstruction: captureRouteSystemInstruction(),
      imageBase64: body.imageBase64,
      mimeType: body.mimeType ?? "image/jpeg",
      temperature: 0,
    });

    const type = data?.type;

    if (type === "label") {
      const parsed = labelResultSchema.safeParse(data.label);
      if (!parsed.success) {
        return NextResponse.json({ ok: true, type: "not_food", model });
      }
      const result = parsed.data;
      const nutrients = cleanNutrients(result.nutrients ?? {});
      const warnings = [...(result.warnings ?? [])];

      const atw = atwaterKcal(nutrients);
      if (atw != null && atw > 0 && nutrients.energy_kcal != null) {
        const deviation = Math.abs(nutrients.energy_kcal - atw) / atw;
        if (deviation > 0.25) {
          warnings.push(
            `Calories (${nutrients.energy_kcal}) differ from the 4·4·9 estimate (${Math.round(
              atw,
            )}) — please double-check.`,
          );
        }
      }

      return NextResponse.json({
        ok: true,
        type: "label",
        model,
        label: {
          name: result.name || "",
          name_th: result.name_th ?? null,
          serving_size: result.serving_size ?? 100,
          serving_unit: result.serving_unit || "g",
          servings_per_container: result.servings_per_container ?? null,
          nutrients,
          confidence: result.confidence ?? 0.5,
          warnings,
        },
      });
    }

    if (type === "meal") {
      const parsed = mealResultSchema.safeParse(data.meal);
      if (!parsed.success) {
        return NextResponse.json({ ok: true, type: "not_food", model });
      }
      const r = parsed.data;

      const items = r.items.map((it) => ({
        name_en: it.name_en || "",
        name_th: it.name_th ?? null,
        count: Math.max(1, Math.round(it.count || 1)),
        estimated_grams: it.estimated_grams || 0,
        grams_low: it.grams_low ?? null,
        grams_high: it.grams_high ?? null,
        household_unit: it.household_unit ?? null,
        nutrients: reconcileEnergy(cleanNutrients(it.nutrients ?? {})),
        per_100g: reconcileEnergy(cleanNutrients(it.per_100g ?? {})),
        confidence: it.confidence ?? 0.5,
        assumptions: it.assumptions ?? [],
      }));

      if (r.not_food || items.length === 0) {
        return NextResponse.json({ ok: true, type: "not_food", model });
      }

      return NextResponse.json({
        ok: true,
        type: "meal",
        model,
        not_food: r.not_food,
        overall_confidence: r.overall_confidence,
        items,
      });
    }

    // "not_food", missing, or unrecognized type.
    return NextResponse.json({ ok: true, type: "not_food", model });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "analyze failed" },
      { status: 500 },
    );
  }
}
