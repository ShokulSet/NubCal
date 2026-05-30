import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/auth";
import { APP_TZ } from "@/lib/config";
import { todayInTimezone } from "@/lib/nutrition/date";
import { LogClient } from "./LogClient";

export default async function LogPage() {
  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) redirect("/login");

  const eatenOn = todayInTimezone(APP_TZ);

  const [{ data: foods }, { data: meals }] = await Promise.all([
    supabase
      .from("foods")
      .select("id, name, serving_size, serving_unit")
      .eq("user_id", userId)
      .order("name"),
    supabase
      .from("meals")
      .select("id, meal_type, meal_items(id, name, quantity, serving_size, serving_unit)")
      .eq("user_id", userId)
      .eq("eaten_on", eatenOn),
  ]);

  const items = (meals ?? []).flatMap((m) =>
    (m.meal_items ?? []).map((it) => ({ ...it, meal_type: m.meal_type })),
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Log · {eatenOn}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Add to today</h1>
      </header>
      <LogClient foods={foods ?? []} items={items} />
    </div>
  );
}
