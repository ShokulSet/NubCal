import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/auth";
import { ensureDefaultNutrients } from "@/lib/data/setup";
import { APP_TZ } from "@/lib/config";
import { todayInTimezone, isIsoDate } from "@/lib/nutrition/date";
import { LogShell } from "./LogShell";

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string; q?: string }>;
}) {
  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) redirect("/login");

  const today = todayInTimezone(APP_TZ);
  // Honor ?date=YYYY-MM-DD for editing a past day; never let it run ahead of today.
  const { date, view, q } = await searchParams;
  const eatenOn = date && isIsoDate(date) && date <= today ? date : today;
  const isFoodsView = view === "foods";

  const [{ data: foods }, { data: meals }] = await Promise.all([
    supabase
      .from("foods")
      .select("id, name, serving_size, serving_unit")
      .eq("user_id", userId)
      .order("name"),
    supabase
      .from("meals")
      .select(
        "id, meal_items(id, name, quantity, serving_size, serving_unit, nutrients_snapshot)",
      )
      .eq("user_id", userId)
      .eq("eaten_on", eatenOn),
  ]);

  const items = (meals ?? []).flatMap((m) =>
    (m.meal_items ?? []).map((it) => ({
      ...it,
      meal_id: m.id,
      nutrients_snapshot: (it.nutrients_snapshot ?? {}) as Record<string, number>,
    })),
  );

  // Library data is only needed for the Foods view; skip the extra round-trips on Log.
  const term = isFoodsView ? q?.trim().replace(/[%,()]/g, " ") : undefined;
  let libraryFoods: {
    id: string;
    name: string;
    brand: string | null;
    serving_size: number;
    serving_unit: string;
    nutrients: Record<string, number>;
  }[] = [];
  let nutrientDefs: {
    id: string;
    key: string;
    display_name: string;
    unit: string;
  }[] = [];

  if (isFoodsView) {
    await ensureDefaultNutrients(supabase, userId);

    let libraryQuery = supabase
      .from("foods")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (term) {
      libraryQuery = libraryQuery.or(`name.ilike.%${term}%,name_th.ilike.%${term}%`);
    }

    const [{ data: rows }, { data: defs }] = await Promise.all([
      libraryQuery,
      supabase
        .from("nutrient_definitions")
        .select("id, key, display_name, unit")
        .eq("user_id", userId)
        .order("sort_order")
        .order("display_name"),
    ]);

    libraryFoods = (rows ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      brand: f.brand,
      serving_size: f.serving_size,
      serving_unit: f.serving_unit,
      nutrients: (f.nutrients ?? {}) as Record<string, number>,
    }));
    nutrientDefs = defs ?? [];
  }

  return (
    <LogShell
      view={isFoodsView ? "foods" : "log"}
      eatenOn={eatenOn}
      today={today}
      foods={foods ?? []}
      items={items}
      libraryFoods={libraryFoods}
      nutrientDefs={nutrientDefs}
      query={q?.trim() ?? ""}
      searched={Boolean(term)}
    />
  );
}
