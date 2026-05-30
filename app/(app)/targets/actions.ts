"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugifyNutrientKey } from "@/lib/nutrition/defaults";

/** Set, update, or clear the default (all-days) target for a nutrient. */
export async function upsertTarget(formData: FormData) {
  const nutrientId = String(formData.get("nutrient_id") ?? "");
  const direction = String(formData.get("direction") ?? "at_least");
  const raw = String(formData.get("target_value") ?? "").trim();
  if (!nutrientId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (raw === "") {
    await supabase
      .from("nutrient_targets")
      .delete()
      .eq("user_id", user.id)
      .eq("nutrient_id", nutrientId)
      .is("day_of_week", null);
    revalidatePath("/targets");
    revalidatePath("/today");
    return;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) return;

  const { data: existing } = await supabase
    .from("nutrient_targets")
    .select("id")
    .eq("user_id", user.id)
    .eq("nutrient_id", nutrientId)
    .is("day_of_week", null)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("nutrient_targets")
      .update({ direction, target_value: value })
      .eq("id", existing.id);
  } else {
    await supabase.from("nutrient_targets").insert({
      user_id: user.id,
      nutrient_id: nutrientId,
      day_of_week: null,
      direction,
      target_value: value,
    });
  }

  revalidatePath("/targets");
  revalidatePath("/today");
}

/** Add a custom nutrient to the user's catalog. */
export async function addNutrient(formData: FormData) {
  const name = String(formData.get("display_name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "g").trim() || "g";
  const kind = String(formData.get("kind") ?? "other").trim() || "other";
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("nutrient_definitions").insert({
    user_id: user.id,
    key: slugifyNutrientKey(name),
    display_name: name,
    unit,
    kind,
    is_energy: false,
    sort_order: 100,
  });

  revalidatePath("/targets");
  revalidatePath("/today");
  revalidatePath("/foods");
}

/** Remove a nutrient entirely (cascades its targets + food entries). */
export async function deleteNutrient(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("nutrient_definitions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/targets");
  revalidatePath("/today");
  revalidatePath("/foods");
}

/** Inline auto-save of a default target value (empty string clears it). */
export async function setTargetValue(
  nutrientId: string,
  direction: string,
  rawValue: string,
) {
  if (!nutrientId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const raw = (rawValue ?? "").trim();
  const dir = direction || "at_least";

  if (raw === "") {
    await supabase
      .from("nutrient_targets")
      .delete()
      .eq("user_id", user.id)
      .eq("nutrient_id", nutrientId)
      .is("day_of_week", null);
    revalidatePath("/targets");
    revalidatePath("/today");
    return;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) return;

  const { data: existing } = await supabase
    .from("nutrient_targets")
    .select("id")
    .eq("user_id", user.id)
    .eq("nutrient_id", nutrientId)
    .is("day_of_week", null)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("nutrient_targets")
      .update({ direction: dir, target_value: value })
      .eq("id", existing.id);
  } else {
    await supabase.from("nutrient_targets").insert({
      user_id: user.id,
      nutrient_id: nutrientId,
      day_of_week: null,
      direction: dir,
      target_value: value,
    });
  }

  revalidatePath("/targets");
  revalidatePath("/today");
}

/** Remove a nutrient by id (callable directly from a client component). */
export async function removeNutrient(id: string) {
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("nutrient_definitions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/targets");
  revalidatePath("/today");
  revalidatePath("/foods");
}
