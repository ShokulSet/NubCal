"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { APP_TZ } from "@/lib/config";
import { todayInTimezone, isIsoDate } from "@/lib/nutrition/date";

/** Log a food into a day's meal (find-or-create the single meal for that day).
 * Defaults to today; honors a valid, non-future `eaten_on` for editing past days. */
export async function logFood(formData: FormData) {
  const foodId = String(formData.get("food_id") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1) || 1;
  if (!foodId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: food } = await supabase
    .from("foods")
    .select("id, name, serving_size, serving_unit, nutrients")
    .eq("id", foodId)
    .single();
  if (!food) return;

  const today = todayInTimezone(APP_TZ);
  const requested = String(formData.get("eaten_on") ?? "");
  const eatenOn = isIsoDate(requested) && requested <= today ? requested : today;

  const { data: existingMeal } = await supabase
    .from("meals")
    .select("id")
    .eq("user_id", user.id)
    .eq("eaten_on", eatenOn)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  let mealId = existingMeal?.id;
  if (!mealId) {
    const { data: created } = await supabase
      .from("meals")
      .insert({ user_id: user.id, eaten_on: eatenOn, status: "logged" })
      .select("id")
      .single();
    mealId = created?.id;
  }
  if (!mealId) return;

  await supabase.from("meal_items").insert({
    meal_id: mealId,
    user_id: user.id,
    food_id: food.id,
    name: food.name,
    quantity,
    serving_size: food.serving_size,
    serving_unit: food.serving_unit,
    nutrients_snapshot: food.nutrients,
  });

  revalidatePath("/log");
  revalidatePath("/today");
  revalidatePath("/settings");
}

/** Edit a logged item's quantity. */
export async function updateMealItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  if (!id || !(Number.isFinite(quantity) && quantity > 0)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("meal_items").update({ quantity }).eq("id", id);

  revalidatePath("/log");
  revalidatePath("/today");
  revalidatePath("/settings");
}

export async function removeMealItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("meal_items").delete().eq("id", id);
  revalidatePath("/log");
  revalidatePath("/today");
  revalidatePath("/settings");
}
