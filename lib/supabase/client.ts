import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Browser-side Supabase client. Holds only the publishable key + the user's
 * session; all access is RLS-scoped to the signed-in user.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
