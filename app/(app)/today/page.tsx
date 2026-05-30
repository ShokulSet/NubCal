import { createClient } from "@/lib/supabase/server";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-zinc-500">Today</p>
        <h1 className="text-2xl font-semibold tracking-tight">Your day</h1>
      </header>

      <div className="rounded-2xl border border-dashed border-black/10 p-8 text-center text-sm text-zinc-500 dark:border-white/15">
        Nutrient progress rings arrive in Milestone&nbsp;1.
        <br />
        Signed in as{" "}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {user?.email}
        </span>
        .
      </div>
    </div>
  );
}
