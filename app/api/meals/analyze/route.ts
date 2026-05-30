import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateJson } from "@/lib/gcp/vertex";
import { MEAL_SYSTEM_INSTRUCTION, analyzeMealPrompt } from "@/lib/prompts/analyze-meal";
import { mealResultSchema, cleanNutrients } from "@/lib/nutrition/capture-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Estimate foods, portions, and nutrients from a meal photo. */
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
    const { data, model } = await generateJson({
      prompt: analyzeMealPrompt(body.hint),
      systemInstruction: MEAL_SYSTEM_INSTRUCTION,
      imageBase64: body.imageBase64,
      mimeType: body.mimeType ?? "image/jpeg",
      temperature: 0.2,
    });

    const parsed = mealResultSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: "could not analyze meal" }, { status: 422 });
    }
    const r = parsed.data;

    const items = r.items.map((it) => ({
      name_en: it.name_en || "",
      name_th: it.name_th ?? null,
      estimated_grams: it.estimated_grams || 0,
      grams_low: it.grams_low ?? null,
      grams_high: it.grams_high ?? null,
      household_unit: it.household_unit ?? null,
      nutrients: cleanNutrients(it.nutrients ?? {}),
      per_100g: cleanNutrients(it.per_100g ?? {}),
      confidence: it.confidence ?? 0.5,
      assumptions: it.assumptions ?? [],
    }));

    return NextResponse.json({
      ok: true,
      model,
      not_food: r.not_food,
      overall_confidence: r.overall_confidence,
      items,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "analyze failed" },
      { status: 500 },
    );
  }
}
