import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted">Settings</p>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      </header>

      <div className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
        <p className="text-sm text-muted">Signed in as</p>
        <p className="font-medium">{user?.email}</p>
      </div>

      <nav className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/15">
        <Link
          href="/targets"
          className="flex items-center justify-between px-4 py-3 text-sm hover:bg-black/[.03] dark:hover:bg-white/[.04]"
        >
          <span>Nutrient targets</span>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>
        <Link
          href="/foods"
          className="flex items-center justify-between border-t border-black/5 px-4 py-3 text-sm hover:bg-black/[.03] dark:border-white/10 dark:hover:bg-white/[.04]"
        >
          <span>Your foods</span>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>
      </nav>

      <form action={signOut}>
        <Button type="submit" variant="outline" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}
