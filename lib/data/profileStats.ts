import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { computeProgress, calorieZone } from "@/lib/nutrition/math";
import { roundTo } from "@/lib/nutrition/format";
import { todayInTimezone } from "@/lib/nutrition/date";
import { APP_TZ } from "@/lib/config";
import type { Progress, ProgressZone, TargetDirection } from "@/lib/nutrition/types";

type Client = SupabaseClient<Database>;

const MACRO_KEYS = ["protein", "carbs", "fat"];

export interface CalendarDay {
  iso: string;
  day: number;
  kcal: number;
  logged: boolean;
  zone: ProgressZone;
  isToday: boolean;
}

export interface ProfileStats {
  monthLabel: string;
  today: string;
  streak: number;
  daysLoggedThisMonth: number;
  calorieAvg: Progress;
  macros: { key: string; label: string; unit: string; progress: Progress }[];
  calendar: CalendarDay[];
  leadingBlanks: number;
  hasAnyTarget: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Shift an ISO date (YYYY-MM-DD) by `delta` days, anchored in UTC to avoid
 * server-local off-by-ones. */
function addDaysIso(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Read-only profile aggregates: streak, days logged, calorie/macro averages,
 * and a per-day calorie map for the current-month heatmap. Mirrors the Today
 * page's daily_nutrient_totals pattern. */
export async function getProfileStats(supabase: Client, userId: string): Promise<ProfileStats> {
  const today = todayInTimezone(APP_TZ); // YYYY-MM-DD in the user's timezone
  const [y, m] = today.split("-").map(Number); // m is 1-based
  const monthStart = `${y}-${pad(m)}-01`;
  const monthPrefix = `${y}-${pad(m)}`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  // One energy query covers the calendar month AND a ~45-day streak/avg window.
  const back45 = addDaysIso(today, -44);
  const rangeFrom = back45 < monthStart ? back45 : monthStart;

  const [{ data: nutrients }, { data: targets }, { data: energyRows }, { data: macroRows }] =
    await Promise.all([
      supabase
        .from("nutrient_definitions")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order")
        .order("display_name"),
      supabase
        .from("nutrient_targets")
        .select("*")
        .eq("user_id", userId)
        .is("day_of_week", null),
      supabase
        .from("daily_nutrient_totals")
        .select("eaten_on, total")
        .eq("user_id", userId)
        .eq("nutrient_key", "energy_kcal")
        .gte("eaten_on", rangeFrom)
        .lte("eaten_on", today),
      supabase
        .from("daily_nutrient_totals")
        .select("eaten_on, nutrient_key, total")
        .eq("user_id", userId)
        .in("nutrient_key", MACRO_KEYS)
        .gte("eaten_on", monthStart)
        .lte("eaten_on", today),
    ]);

  const targetByNutrient = new Map((targets ?? []).map((t) => [t.nutrient_id, t]));
  const defByKey = new Map((nutrients ?? []).map((n) => [n.key, n]));

  // Calorie target/direction from the user's energy nutrient.
  const energyDef = (nutrients ?? []).find((n) => n.is_energy);
  const energyTarget = energyDef ? targetByNutrient.get(energyDef.id) : undefined;
  const calorieTarget = energyTarget?.target_value ?? null;
  const calorieDir = (energyTarget?.direction as TargetDirection) ?? "around";

  // eaten_on -> kcal (the view only emits rows for days with logs).
  const kcalByDate = new Map(
    (energyRows ?? []).map((r) => [r.eaten_on as string, Number(r.total ?? 0)]),
  );
  // macro key -> (eaten_on -> amount)
  const macroByDate = new Map<string, Map<string, number>>(MACRO_KEYS.map((k) => [k, new Map()]));
  for (const r of macroRows ?? []) {
    macroByDate.get(r.nutrient_key as string)?.set(r.eaten_on as string, Number(r.total ?? 0));
  }

  // Current streak: consecutive logged days ending today (or yesterday if today
  // hasn't been logged yet — an empty today shouldn't read as a broken streak).
  let streak = 0;
  let cursor = today;
  if (!((kcalByDate.get(cursor) ?? 0) > 0)) cursor = addDaysIso(cursor, -1);
  while ((kcalByDate.get(cursor) ?? 0) > 0) {
    streak += 1;
    cursor = addDaysIso(cursor, -1);
  }

  // Logged days this month — also the denominator for the averages.
  const loggedMonthIso = Array.from(kcalByDate.entries())
    .filter(([iso, kcal]) => iso.startsWith(monthPrefix) && kcal > 0)
    .map(([iso]) => iso);
  const daysLoggedThisMonth = loggedMonthIso.length;

  const mean = (vals: number[]) =>
    vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;

  const avgKcal = roundTo(mean(loggedMonthIso.map((iso) => kcalByDate.get(iso) ?? 0)), 0);
  const calorieAvg = computeProgress(avgKcal, calorieTarget, calorieDir);

  const macros = MACRO_KEYS.map((key) => {
    const def = defByKey.get(key);
    if (!def) return null;
    const perDay = macroByDate.get(key)!;
    const avg = roundTo(mean(loggedMonthIso.map((iso) => perDay.get(iso) ?? 0)), 0);
    const t = targetByNutrient.get(def.id);
    return {
      key,
      label: def.display_name,
      unit: def.unit,
      progress: computeProgress(avg, t?.target_value ?? null, (t?.direction as TargetDirection) ?? "around"),
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  // Calendar cells for the current month.
  const calendar: CalendarDay[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${monthPrefix}-${pad(day)}`;
    const kcal = kcalByDate.get(iso) ?? 0;
    const logged = kcal > 0;
    calendar.push({
      iso,
      day,
      kcal,
      logged,
      zone: logged ? calorieZone(kcal, calorieTarget) : "none",
      isToday: iso === today,
    });
  }

  // Mon–Sun grid: how many blank cells before day 1.
  const leadingBlanks = (new Date(`${monthStart}T00:00:00Z`).getUTCDay() + 6) % 7;

  const hasAnyTarget = calorieTarget != null || macros.some((mm) => mm.progress.target != null);

  return {
    monthLabel: new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
    today,
    streak,
    daysLoggedThisMonth,
    calorieAvg,
    macros,
    calendar,
    leadingBlanks,
    hasAnyTarget,
  };
}
