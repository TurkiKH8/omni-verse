import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json() as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    // Use a server-side Supabase client so the session gets persisted as
    // cookies — proxy.ts (the Next.js 16 middleware) needs them to grant
    // access to /admin/* routes.
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* ignore */ }
        },
      },
    });

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);

    let result;
    try {
      result = await supabase.auth.signInWithPassword({ email, password });
    } finally {
      clearTimeout(t);
    }

    const { data, error } = result;

    if (error || !data.session) {
      const msg = error?.message ?? "Invalid login credentials";
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user_id: data.session.user.id,
    });
  } catch (err: unknown) {
    const e = err as { name?: string };
    if (e.name === "AbortError") {
      return NextResponse.json({ error: "Connection to auth server timed out" }, { status: 408 });
    }
    return NextResponse.json({ error: "Server error — please try again" }, { status: 500 });
  }
}
