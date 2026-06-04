import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/auth";
import { APP_TZ } from "@/lib/config";
import { todayInTimezone, isIsoDate } from "@/lib/nutrition/date";
import { LogClient } from "./LogClient";

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) redirect("/login");

  const today = todayInTimezone(APP_TZ);
  // Honor ?date=YYYY-MM-DD for editing a past day; never let it run ahead of today.
  const { date } = await searchParams;
  const eatenOn = date && isIsoDate(date) && date <= today ? date : today;

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

  return (
    <div className="space-y-6">
      <LogClient foods={foods ?? []} items={items} eatenOn={eatenOn} today={today} />
    </div>
  );
}
