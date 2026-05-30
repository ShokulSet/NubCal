"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { APP_TZ } from "@/lib/config";
import { todayInTimezone } from "@/lib/nutrition/date";

/** Log a food into today's meal of the given type (find-or-create the meal). */
export async function logFood(formData: FormData) {
  const foodId = String(formData.get("food_id") ?? "");
  const mealType = String(formData.get("meal_type") ?? "other");
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

  const eatenOn = todayInTimezone(APP_TZ);

  const { data: existingMeal } = await supabase
    .from("meals")
    .select("id")
    .eq("user_id", user.id)
    .eq("eaten_on", eatenOn)
    .eq("meal_type", mealType)
    .maybeSingle();

  let mealId = existingMeal?.id;
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
    food_id: food.id,
    name: food.name,
    quantity,
    serving_size: food.serving_size,
    serving_unit: food.serving_unit,
    nutrients_snapshot: food.nutrients,
  });

  revalidatePath("/log");
  revalidatePath("/today");
}

export async function removeMealItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("meal_items").delete().eq("id", id);
  revalidatePath("/log");
  revalidatePath("/today");
}
