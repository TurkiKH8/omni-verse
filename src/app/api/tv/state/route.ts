import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Service-role client — same trusted server-side pattern as the other
// /api/tv routes. The TV polls THIS route for its own session instead
// of reading the tv_sessions table with the public key, so the table
// no longer needs a public SELECT policy (which would have let anyone
// dump every session's questions + answers).
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Only the TV that created the session knows its random UUID, so a
// caller can only ever read the one session it already owns. We return
// just what the screen needs — never the code or controller id.
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id || !/^[0-9a-fA-F-]{32,40}$/.test(id)) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const { data, error } = await adminClient
      .from("tv_sessions")
      .select("phase, state")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json(
      { phase: data.phase, state: data.state ?? null },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
