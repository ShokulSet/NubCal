import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfileStats } from "@/lib/data/profileStats";
import { calorieZone } from "@/lib/nutrition/math";
import { signOut } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { WidgetField } from "@/components/settings/WidgetField";
import { NutrientRing } from "@/components/nutrition/NutrientRing";
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
        <div className="grid grid-cols-3 gap-4 text-center">
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
          <div>
            <p className="eyebrow">Avg / day</p>
            <p
              className={cn(
                "tnum mt-1.5 font-mono text-[1.8rem] leading-none",
                ZONE_TEXT[calorieZone(stats.calorieAvg.total, stats.calorieAvg.target)],
              )}
            >
              {avgKcal}
            </p>
            <p className="mt-1 text-xs text-muted">
              {stats.calorieAvg.target != null
                ? `/ ${Math.round(stats.calorieAvg.target)} kcal`
                : "kcal"}
            </p>
          </div>
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
          href="/foods"
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
