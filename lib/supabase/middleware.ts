import "./ws-polyfill";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Public paths reachable without a session. */
function isPublicPath(path: string) {
  return (
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/auth") ||
    // Token-authenticated home-screen widget endpoint (no login session).
    path.startsWith("/api/widget")
  );
}

/**
 * Refreshes the Supabase auth session on every request and guards app routes.
 * Must run in middleware so the refreshed cookie is written to the response.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Fast auth: verify the JWT locally via getClaims (no network round-trip);
  // fall back to getUser (which refreshes the session) only when the token is
  // missing/expired. Both are wrapped so a corrupted cookie is treated as
  // logged-out instead of crashing the request.
  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims as { sub?: string; exp?: number } | undefined;
    if (
      claims?.sub &&
      (typeof claims.exp !== "number" || claims.exp * 1000 > Date.now())
    ) {
      userId = claims.sub;
    }
  } catch {
    userId = null;
  }
  if (!userId) {
    try {
      const result = await supabase.auth.getUser();
      userId = result.data.user?.id ?? null;
    } catch {
      userId = null;
    }
  }

  if (!userId && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
