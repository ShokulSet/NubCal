"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureDefaultNutrients } from "@/lib/data/setup";
import { APP_TZ } from "@/lib/config";
import { todayInTimezone } from "@/lib/nutrition/date";
import { normalizeBarcode } from "@/lib/providers/types";

interface ScanPayload {
  barcode?: string;
  source?: string;
  name?: string;
  name_th?: string | null;
  brand?: string | null;
  serving_size?: number;
  serving_unit?: string;
  nutrients?: Record<string, number>;
}

/** Save a scanned product to the user's food cache (if new) and log it to today. */
export async function logScannedProduct(formData: FormData) {
  const payloadRaw = String(formData.get("payload") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1) || 1;
  const mealType = String(formData.get("meal_type") ?? "other");
  if (!payloadRaw) return;

  let payload: ScanPayload;
  try {
    payload = JSON.parse(payloadRaw) as ScanPayload;
  } catch {
    return;
  }
  const barcode = normalizeBarcode(String(payload.barcode ?? ""));
  if (!barcode) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await ensureDefaultNutrients(supabase, user.id);

  // Find-or-create the cached food for this barcode.
  let foodId: string | undefined;
  const { data: existing } = await supabase
    .from("foods")
    .select("id")
    .eq("user_id", user.id)
    .eq("barcode", barcode)
    .maybeSingle();

  if (existing) {
    foodId = existing.id;
  } else {
    const source =
      payload.source === "usda" || payload.source === "off"
        ? payload.source
        : "manual";
    const { data: food } = await supabase
      .from("foods")
      .insert({
        user_id: user.id,
        barcode,
        source,
        name: String(payload.name ?? `Product ${barcode}`),
        name_th: payload.name_th ?? null,
        brand: payload.brand ?? null,
        serving_size: Number(payload.serving_size) || 100,
        serving_unit: String(payload.serving_unit ?? "g"),
      })
      .select("id")
      .single();
    if (!food) return;
    foodId = food.id;

    const { data: defs } = await supabase
      .from("nutrient_definitions")
      .select("id, key")
      .eq("user_id", user.id);
    const idByKey = new Map((defs ?? []).map((d) => [d.key, d.id]));

    const rows: { food_id: string; nutrient_id: string; amount: number }[] = [];
    for (const [key, amount] of Object.entries(payload.nutrients ?? {})) {
      const nid = idByKey.get(key);
      if (nid && Number.isFinite(amount)) {
        rows.push({ food_id: food.id, nutrient_id: nid, amount });
      }
    }
    if (rows.length) await supabase.from("food_nutrients").insert(rows);
  }

  if (!foodId) return;

  // Read the canonical food (nutrients JSONB now built by the trigger).
  const { data: food } = await supabase
    .from("foods")
    .select("name, serving_size, serving_unit, nutrients")
    .eq("id", foodId)
    .single();
  if (!food) return;

  const eatenOn = todayInTimezone(APP_TZ);
  const { data: meal } = await supabase
    .from("meals")
    .select("id")
    .eq("user_id", user.id)
    .eq("eaten_on", eatenOn)
    .eq("meal_type", mealType)
    .maybeSingle();

  let mealId = meal?.id;
  if (!mealId) {
    const { data: created } = await supabase
      .from("meals")
      .insert({ user_id: user.id, eaten_on: eatenOn, meal_type: mealType, status: "logged" })
      .select("id")
      .single();
    mealId = created?.id;
  }
  if (!mealId) return;

  await supabase.from("meal_items").insert({
    meal_id: mealId,
    user_id: user.id,
    food_id: foodId,
    name: food.name,
    quantity,
    serving_size: food.serving_size,
    serving_unit: food.serving_unit,
    nutrients_snapshot: food.nutrients,
  });

  revalidatePath("/today");
  revalidatePath("/log");
  revalidatePath("/foods");
  redirect("/today");
}
