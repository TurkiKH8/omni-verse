import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "recovery" | "signup" | "invite" | "magiclink" | "email" | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    // For password recovery always land on the reset-password form.
    // For every other type use the `next` param (or "/" as fallback).
    const destination = type === "recovery" ? "/reset-password" : next;

    // Build the redirect response FIRST so we can attach session cookies to it.
    // If we set cookies on cookieStore and then return a separate NextResponse.redirect,
    // the cookies don't travel with the redirect — the session would be lost.
    const redirectResponse = NextResponse.redirect(new URL(destination, origin));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              redirectResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return redirectResponse;
    }
  }

  // Link is invalid or expired — send back to forgot-password with a visible error.
  const errorUrl = new URL("/forgot-password", origin);
  errorUrl.searchParams.set("error", "invalid_link");
  return NextResponse.redirect(errorUrl);
}
