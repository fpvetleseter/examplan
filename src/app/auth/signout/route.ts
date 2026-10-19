import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function POST(request: NextRequest) {
  // Reject cross-site form posts (forced logout).
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const { url, publishableKey } = getSupabaseEnv();
  const pending: { name: string; value: string; options: CookieOptions }[] = [];
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        pending.push(...cookiesToSet);
      },
    },
  });
  // Revokes the refresh token; the client clears its session cookies even if revocation fails.
  const { error } = await supabase.auth.signOut();
  const response = NextResponse.redirect(new URL(error ? "/login?signout=incomplete" : "/", request.url), 303);
  pending.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  if (error) {
    // Never leave this device signed in, even if the auth server could not be reached.
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith("sb-")) response.cookies.set(name, "", { path: "/", maxAge: 0 });
    });
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
