import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes a Basic Developer is allowed to access
const DEVELOPER_ALLOWED = ["/admin/questions", "/admin/login"];

// Staff ranks recognised by the admin sidebar's STAFF_RANKS list.
// Master Omni gets full admin-equivalent access; the other ranks see only
// the staffVisible / non-adminOnly sidebar items, which map to:
//   /admin/dashboard, /admin/categories, /admin/questions
const STAFF_RANKS  = ["Omni 1", "Omni 2", "Omni 3", "Master Omni"];
const STAFF_ALLOWED = ["/admin/dashboard", "/admin/categories", "/admin/questions"];

export async function proxy(request: NextRequest) {
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
      .select("is_admin, developer_level, rank")
      .eq("id", user.id)
      .maybeSingle();

    // Full admin OR Master Omni — allow everything
    if (profile?.is_admin || profile?.rank === "Master Omni") {
      return response;
    }

    // Other staff ranks (Omni 1/2/3) — allow only the staff-visible routes
    if (profile?.rank && STAFF_RANKS.includes(profile.rank)) {
      const allowed = STAFF_ALLOWED.some((p) => pathname.startsWith(p));
      if (allowed) return response;
    }

    // Developer — allow only permitted routes
    if (profile?.developer_level) {
      const allowed = DEVELOPER_ALLOWED.some((p) => pathname.startsWith(p));
      if (allowed) return response;
    }

    // No valid role
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
