import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { DEFAULT_NUTRIENTS } from "@/lib/nutrition/defaults";

type Client = SupabaseClient<Database>;

/** Seed the default nutrient set for a user once (idempotent). */
export async function ensureDefaultNutrients(supabase: Client, userId: string) {
  const { count } = await supabase
    .from("nutrient_definitions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count && count > 0) return;

  const rows = DEFAULT_NUTRIENTS.map((n) => ({
    user_id: userId,
    key: n.key,
    display_name: n.display_name,
    unit: n.unit,
    kind: n.kind,
    is_energy: n.is_energy,
    sort_order: n.sort_order,
  }));

  await supabase
    .from("nutrient_definitions")
    .upsert(rows, { onConflict: "user_id,key", ignoreDuplicates: true });
}
