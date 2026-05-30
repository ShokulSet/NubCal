import type { SupabaseClient } from "@supabase/supabase-js";

interface Claims {
  sub?: string;
  exp?: number;
}

/**
 * Resolve the signed-in user's id quickly: verify the JWT locally via getClaims
 * (ES256 / JWKS — no network), falling back to getUser (which also refreshes the
 * session) only when the token is missing/expired. Safe because the project uses
 * asymmetric signing keys, so the signature is cryptographically validated.
 */
export async function getAuthUserId(
  supabase: SupabaseClient,
): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims as Claims | undefined;
    if (
      claims?.sub &&
      (typeof claims.exp !== "number" || claims.exp * 1000 > Date.now())
    ) {
      return claims.sub;
    }
  } catch {
    /* fall through to the full check */
  }

  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}
