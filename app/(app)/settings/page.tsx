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
        <p className="text-sm text-zinc-500">Settings</p>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      </header>

      <div className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
        <p className="text-sm text-zinc-500">Signed in as</p>
        <p className="font-medium">{user?.email}</p>
      </div>

      <form action={signOut}>
        <Button type="submit" variant="outline" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}
