import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfileStats } from "@/lib/data/profileStats";
import { calorieStatus, calorieZone, CALORIE_STATUS } from "@/lib/nutrition/math";
import { signOut } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { WidgetField } from "@/components/settings/WidgetField";
import { NutrientRing } from "@/components/nutrition/NutrientRing";
import { CalorieStatusPill } from "@/components/nutrition/CalorieStatusPill";
import { MonthCalendar } from "@/components/nutrition/MonthCalendar";
import { cn } from "@/lib/utils";
import type { ProgressZone } from "@/lib/nutrition/types";

const ZONE_TEXT: Record<ProgressZone, string> = {
  none: "text-ink",
  low: "text-low",
  moderate: "text-mod",
  good: "text-good",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const [{ data: profile }, stats] = await Promise.all([
    supabase.from("profiles").select("widget_token").eq("id", user.id).single(),
    getProfileStats(supabase, user.id),
  ]);
  const widgetUrl = profile?.widget_token
    ? `${base}/api/widget?token=${profile.widget_token}`
    : null;

  const avgKcal = Math.round(stats.calorieAvg.total);
  const target = stats.calorieAvg.target;
  const avgZone = calorieZone(avgKcal, target);
  const avgLabel = CALORIE_STATUS[calorieStatus(avgKcal, target)];

  // Sign-aware kcal/day deltas for the analysis facts.
  const surplus = target != null ? avgKcal - Math.round(target) : null;
  const fmtDelta = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}`;
  const trendDelta = stats.prevMonthAvg != null ? avgKcal - stats.prevMonthAvg : null;

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-leaf/10 text-leaf">
          <UserRound className="h-8 w-8" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">Profile</p>
          <h1 className="text-[2.2rem] leading-none">You</h1>
          {user.email && <p className="mt-1 truncate text-sm text-muted">{user.email}</p>}
        </div>
      </header>

      <section className="rounded-3xl border border-line bg-surface/50 p-5">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="eyebrow">Streak</p>
            <p className="tnum mt-1.5 font-mono text-[1.8rem] leading-none text-ink">
              {stats.streak}
            </p>
            <p className="mt-1 text-xs text-muted">day{stats.streak === 1 ? "" : "s"}</p>
          </div>
          <div>
            <p className="eyebrow">Logged</p>
            <p className="tnum mt-1.5 font-mono text-[1.8rem] leading-none text-ink">
              {stats.daysLoggedThisMonth}
            </p>
            <p className="mt-1 text-xs text-muted">days this month</p>
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="eyebrow">Avg / day</p>
            <CalorieStatusPill zone={avgZone} label={avgLabel} />
          </div>
          <p className="mt-1.5 flex items-baseline gap-2">
            <span className={cn("tnum font-mono text-[2rem] leading-none", ZONE_TEXT[avgZone])}>
              {avgKcal}
            </span>
            <span className="text-sm text-muted">
              {target != null ? `/ ${Math.round(target)} kcal` : "kcal"}
            </span>
          </p>

          {(surplus != null || trendDelta != null) && (
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
              {surplus != null && (
                <span>
                  <span className="tnum font-mono text-ink">{fmtDelta(surplus)}</span> / day{" "}
                  {surplus > 0 ? "over goal" : surplus < 0 ? "under goal" : "on goal"}
                </span>
              )}
              {target != null && (
                <span>
                  <span className="tnum font-mono text-ink">{stats.daysOnTrackThisMonth}</span> of{" "}
                  <span className="tnum font-mono text-ink">{stats.daysLoggedThisMonth}</span> days
                  on track
                </span>
              )}
              {trendDelta != null && (
                <span>
                  <span className="tnum font-mono text-ink">{fmtDelta(trendDelta)}</span> / day vs{" "}
                  {stats.prevMonthLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {stats.macros.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-8 border-t border-line pt-7">
            {stats.macros.map((mac) => (
              <div key={mac.key} className="w-24">
                <NutrientRing label={mac.label} unit={mac.unit} progress={mac.progress} />
              </div>
            ))}
          </div>
        )}
      </section>

      <MonthCalendar
        monthLabel={stats.monthLabel}
        leadingBlanks={stats.leadingBlanks}
        days={stats.calendar}
        today={stats.today}
        weekdayStart="mon"
      />

      <nav className="overflow-hidden rounded-2xl border border-line">
        <Link
          href="/targets"
          className="flex items-center justify-between px-4 py-3 text-sm hover:bg-black/[.03] dark:hover:bg-white/[.04]"
        >
          <span>Nutrient targets</span>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>
        <Link
          href="/log?view=foods"
          className="flex items-center justify-between border-t border-line px-4 py-3 text-sm hover:bg-black/[.03] dark:hover:bg-white/[.04]"
        >
          <span>Your foods</span>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>
      </nav>

      {widgetUrl && (
        <section className="space-y-2">
          <p className="eyebrow">Home-screen widget</p>
          <WidgetField url={widgetUrl} />
          <p className="text-xs text-muted">
            Paste this link into the Scriptable app to show today&apos;s totals on your home
            screen. Keep it private — anyone with the link can read today&apos;s numbers.
          </p>
        </section>
      )}

      <form action={signOut}>
        <SubmitButton variant="outline" className="w-full" pendingLabel="Signing out…">
          Sign out
        </SubmitButton>
      </form>
    </div>
  );
}
