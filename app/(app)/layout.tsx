import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/auth";
import { BottomNav } from "@/components/nav/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) redirect("/login");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-24 pt-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
