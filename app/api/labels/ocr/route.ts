import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateJson } from "@/lib/gcp/gemini";
import { OCR_SYSTEM_INSTRUCTION, ocrLabelPrompt } from "@/lib/prompts/ocr-label";
import {
  labelResultSchema,
  cleanNutrients,
  atwaterKcal,
} from "@/lib/nutrition/capture-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

/** OCR a nutrition-label photo into normalized per-serving nutrients. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { imageBase64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!body.imageBase64) {
    return NextResponse.json({ error: "missing image" }, { status: 400 });
  }

  try {
    const { data, raw, model } = await generateJson({
      prompt: ocrLabelPrompt(),
      systemInstruction: OCR_SYSTEM_INSTRUCTION,
      imageBase64: body.imageBase64,
      mimeType: body.mimeType ?? "image/jpeg",
      temperature: 0,
    });

    const parsed = labelResultSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "could not parse label", raw: raw.slice(0, 300) },
        { status: 422 },
      );
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
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ocr failed" },
      { status: 500 },
    );
  }
}
