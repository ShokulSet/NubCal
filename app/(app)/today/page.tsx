import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ensureDefaultNutrients } from "@/lib/data/setup";
import { APP_TZ } from "@/lib/config";
import { todayInTimezone } from "@/lib/nutrition/date";
import { computeProgress } from "@/lib/nutrition/math";
import { roundTo } from "@/lib/nutrition/format";
import { NutrientRing } from "@/components/nutrition/NutrientRing";
import type { TargetDirection } from "@/lib/nutrition/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  const totalByKey = new Map((totals ?? []).map((t) => [t.nutrient_key, Number(t.total ?? 0)]));
  const targetByNutrient = new Map((targets ?? []).map((t) => [t.nutrient_id, t]));

  const progresses = (nutrients ?? [])
    .filter((n) => targetByNutrient.has(n.id))
    .map((n) => {
      const t = targetByNutrient.get(n.id)!;
      return {
        n,
        progress: computeProgress(
          totalByKey.get(n.key) ?? 0,
          t.target_value ?? null,
          t.direction as TargetDirection,
        ),
      };
    });
  const onTrack = progresses.filter(
    (p) => p.progress.status === "met" || p.progress.status === "on_track",
  ).length;

  const dateLabel = new Date(`${eatenOn}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-9">
      <header className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">{dateLabel}</p>
            <h1 className="mt-1 text-[2.6rem] leading-[1.02]">Today</h1>
          </div>
          <Link
            href="/targets"
            className="mt-2 text-sm font-medium text-leaf underline-offset-4 hover:underline"
          >
            Targets
          </Link>
        </div>
        {progresses.length > 0 && (
          <p className="text-sm text-muted">
            <span className="tnum font-mono text-ink">{onTrack}</span> of{" "}
            <span className="tnum font-mono text-ink">{progresses.length}</span> targets on track
          </p>
        )}
      </header>

      {progresses.length === 0 ? (
        <div className="space-y-4 rounded-3xl border border-line bg-surface/60 p-10 text-center">
          <p className="text-sm text-muted">Set a target to see your progress rings.</p>
          <Link href="/targets">
            <Button>Set targets</Button>
          </Link>
        </div>
      ) : (
        <section className="rounded-3xl border border-line bg-surface/50 px-3 py-7">
          <div className="grid grid-cols-3 gap-x-2 gap-y-7">
            {progresses.map(({ n, progress }) => (
              <NutrientRing
                key={n.id}
                label={n.display_name}
                unit={n.unit}
                progress={progress}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <p className="eyebrow">Intake today</p>
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface/40">
          {(nutrients ?? []).map((n, i) => (
            <li
              key={n.id}
              className={cn(
                "flex items-center justify-between px-4 py-3",
                i > 0 && "border-t border-line",
              )}
            >
              <span className="text-sm text-ink/80">{n.display_name}</span>
              <span className="tnum font-mono text-sm text-ink">
                {roundTo(totalByKey.get(n.key) ?? 0, 1)}{" "}
                <span className="text-muted">{n.unit}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Link href="/log" className="fixed bottom-24 right-5 z-30" aria-label="Add to today">
        <Button size="icon" className="h-14 w-14 shadow-[0_16px_32px_-12px_rgba(31,107,67,0.65)]">
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
}
