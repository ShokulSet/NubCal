import { redirect } from "next/navigation";
import { Trirong, IBM_Plex_Sans_Thai } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/auth";
import { BottomNav } from "@/components/nav/BottomNav";
import { AddSpeedDial } from "@/components/nav/AddSpeedDial";

// Thai companions, scoped to the authed shell only (auth pages are English-only).
// preload:false → the files download lazily, the first time a Thai glyph paints.
const displayThai = Trirong({
  weight: ["400", "500", "600"],
  subsets: ["thai"],
  variable: "--font-trirong",
  display: "swap",
  preload: false,
});

const sansThai = IBM_Plex_Sans_Thai({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai"],
  variable: "--font-plexthai",
  display: "swap",
  preload: false,
});

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) redirect("/login");

  return (
    <div
      className={`${displayThai.variable} ${sansThai.variable} flex min-h-full flex-1 flex-col`}
    >
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-24 pt-6">
        {children}
      </main>
      <AddSpeedDial />
      <BottomNav />
    </div>
  );
}
