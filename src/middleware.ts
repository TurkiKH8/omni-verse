import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes a Basic Developer is allowed to access
const DEVELOPER_ALLOWED = ["/admin/questions", "/admin/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // ── Admin portal protection ──────────────────────────────────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, developer_level")
      .eq("id", user.id)
      .maybeSingle();

    // Full admin — allow everything
    if (profile?.is_admin) {
      return response;
    }

    // Developer — allow only permitted routes
    if (profile?.developer_level) {
      const allowed = DEVELOPER_ALLOWED.some((p) => pathname.startsWith(p));
      if (allowed) return response;
    }

    // No valid role
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // ── Arena protection ────────────────────────────────────────────────────
  if (pathname === "/arena") {
    if (!user) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", "/arena");
      return NextResponse.redirect(url);
    }
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!purchase) {
      const url = new URL("/buy", request.url);
      url.searchParams.set("reason", "access");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/arena"],
};
