import Link from "next/link";
import { redirect } from "next/navigation";
import { SlidersHorizontal, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ensureDefaultNutrients } from "@/lib/data/setup";
import { APP_TZ } from "@/lib/config";
import { todayInTimezone } from "@/lib/nutrition/date";
import { computeProgress } from "@/lib/nutrition/math";
import { roundTo } from "@/lib/nutrition/format";
import { NutrientRing } from "@/components/nutrition/NutrientRing";
import type { TargetDirection } from "@/lib/nutrition/types";
import { Button } from "@/components/ui/button";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await ensureDefaultNutrients(supabase, user.id);
  const eatenOn = todayInTimezone(APP_TZ);

  const [{ data: nutrients }, { data: targets }, { data: totals }] = await Promise.all([
    supabase
      .from("nutrient_definitions")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order")
      .order("display_name"),
    supabase
      .from("nutrient_targets")
      .select("*")
      .eq("user_id", user.id)
      .is("day_of_week", null),
    supabase
      .from("daily_nutrient_totals")
      .select("nutrient_key, total")
      .eq("user_id", user.id)
      .eq("eaten_on", eatenOn),
  ]);

  const totalByKey = new Map(
    (totals ?? []).map((t) => [t.nutrient_key, Number(t.total ?? 0)]),
  );
  const targetByNutrient = new Map((targets ?? []).map((t) => [t.nutrient_id, t]));
  const targeted = (nutrients ?? []).filter((n) => targetByNutrient.has(n.id));

  const dateLabel = new Date(`${eatenOn}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-zinc-500">{dateLabel}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        </div>
        <Link
          href="/targets"
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600"
        >
          <SlidersHorizontal className="h-4 w-4" /> Targets
        </Link>
      </header>

      {targeted.length === 0 ? (
        <div className="space-y-4 rounded-2xl border border-dashed border-black/10 p-8 text-center dark:border-white/15">
          <p className="text-sm text-zinc-500">Set a target to see your progress rings.</p>
          <Link href="/targets">
            <Button>Set targets</Button>
          </Link>
        </div>
      ) : (
        <section className="grid grid-cols-3 gap-x-2 gap-y-6">
          {targeted.map((n) => {
            const t = targetByNutrient.get(n.id)!;
            const progress = computeProgress(
              totalByKey.get(n.key) ?? 0,
              t.target_value ?? null,
              t.direction as TargetDirection,
            );
            return (
              <NutrientRing
                key={n.id}
                label={n.display_name}
                unit={n.unit}
                progress={progress}
              />
            );
          })}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-500">All intake today</h2>
        <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/15">
          {(nutrients ?? []).map((n) => (
            <li key={n.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{n.display_name}</span>
              <span className="font-medium">
                {roundTo(totalByKey.get(n.key) ?? 0, 1)} {n.unit}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Link href="/log" className="fixed bottom-20 right-4 z-30" aria-label="Add to today">
        <Button size="icon" className="h-14 w-14 rounded-full shadow-lg">
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
}
