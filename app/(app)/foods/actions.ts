"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Create a manual food + its per-serving nutrient rows (trigger builds the JSONB). */
export async function createFood(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const servingSize = Number(formData.get("serving_size") ?? 100) || 100;
  const servingUnit = String(formData.get("serving_unit") ?? "g").trim() || "g";
  if (!name) redirect("/foods/new?error=Name+is+required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: nutrients } = await supabase
    .from("nutrient_definitions")
    .select("id")
    .eq("user_id", user.id);

  const { data: food, error } = await supabase
    .from("foods")
    .insert({
      user_id: user.id,
      name,
      brand,
      source: "manual",
      serving_size: servingSize,
      serving_unit: servingUnit,
    })
    .select("id")
    .single();

  if (error || !food) redirect("/foods/new?error=Could+not+save+food");

  const rows: { food_id: string; nutrient_id: string; amount: number }[] = [];
  for (const n of nutrients ?? []) {
    const raw = String(formData.get(`amount_${n.id}`) ?? "").trim();
    if (raw === "") continue;
    const amount = Number(raw);
    if (Number.isFinite(amount)) {
      rows.push({ food_id: food.id, nutrient_id: n.id, amount });
    }
  }
  if (rows.length) {
    await supabase.from("food_nutrients").insert(rows);
  }

  revalidatePath("/foods");
  revalidatePath("/log");
  redirect("/foods");
}

/** Update a food's identity + per-serving nutrient rows (trigger rebuilds the JSONB). */
export async function updateFood(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const servingSize = Number(formData.get("serving_size") ?? 100) || 100;
  const servingUnit = String(formData.get("serving_unit") ?? "g").trim() || "g";
  if (!id || !name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("foods")
    .update({ name, brand, serving_size: servingSize, serving_unit: servingUnit })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return;

  const { data: nutrients } = await supabase
    .from("nutrient_definitions")
    .select("id")
    .eq("user_id", user.id);

  // Replace the per-serving rows wholesale — keeps cleared values out and lets
  // the JSONB-rebuild trigger settle on the final state.
  const rows: { food_id: string; nutrient_id: string; amount: number }[] = [];
  for (const n of nutrients ?? []) {
    const raw = String(formData.get(`amount_${n.id}`) ?? "").trim();
    if (raw === "") continue;
    const amount = Number(raw);
    if (Number.isFinite(amount)) {
      rows.push({ food_id: id, nutrient_id: n.id, amount });
    }
  }

  await supabase.from("food_nutrients").delete().eq("food_id", id);
  if (rows.length) {
    await supabase.from("food_nutrients").insert(rows);
  }

  revalidatePath("/foods");
  revalidatePath("/log");
  revalidatePath("/today");
}

export async function deleteFood(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("foods").delete().eq("id", id);
  revalidatePath("/foods");
}
