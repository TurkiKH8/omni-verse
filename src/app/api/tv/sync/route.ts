import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Service-role client — same trusted server-side pattern as the other
// /api/tv routes. The phone (the one linked controller) pushes its
// live game snapshot here; the server writes it onto the session row.
// The browser never writes tv_sessions directly.
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Called by the phone whenever the game changes (board, question,
// answer, results). The TV polls the row and re-draws.
export async function POST(request: NextRequest) {
  try {
    const { sessionId, state } = (await request.json()) as {
      sessionId: string;
      state: unknown;
    };

    if (!sessionId || typeof state !== "object" || state === null) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    // Only a linked session can receive a mirror; if the TV ended or
    // the row expired this is a harmless no-op the phone can ignore.
    const { error } = await adminClient
      .from("tv_sessions")
      .update({ state, updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("phase", "linked");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
