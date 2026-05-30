import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Holds only the publishable key + the user's
 * session; all access is RLS-scoped to the signed-in user.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
