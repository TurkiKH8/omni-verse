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

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);

    let resp: Response;
    try {
      resp = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: supabaseKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }

    const body = await resp.json() as Record<string, unknown>;

    if (!resp.ok) {
      const msg = (body.error_description || body.msg || body.message || "Invalid login credentials") as string;
      return NextResponse.json({ error: msg }, { status: resp.status });
    }

    return NextResponse.json({
      access_token: body.access_token as string,
      refresh_token: body.refresh_token as string,
    });
  } catch (err: unknown) {
    const e = err as { name?: string };
    if (e.name === "AbortError") {
      return NextResponse.json({ error: "Connection to auth server timed out" }, { status: 408 });
    }
    return NextResponse.json({ error: "Server error — please try again" }, { status: 500 });
  }
}
