import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Service-role client — same trusted server-side pattern as
// /api/arena/use-coin and /api/guardian/claim. The "claim" (binding a
// phone as the one controller) is decided here against the database,
// never trusted from the browser.
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Called by the phone after the customer types the 4 digits shown on
// the TV. Validates the code and, if good, locks this phone in as the
// single remote control for that TV.
export async function POST(request: NextRequest) {
  try {
    const { code, userId } = (await request.json()) as {
      code: string;
      userId: string;
    };

    const clean = String(code ?? "").trim();
    if (!/^\d{4}$/.test(clean) || !userId) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    // Find the active session for this code. The partial unique index
    // means at most one non-ended row can hold a given code.
    const { data: session } = await adminClient
      .from("tv_sessions")
      .select("id, phase, expires_at")
      .eq("code", clean)
      .neq("phase", "ended")
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "invalid" }, { status: 404 });
    }
    if (new Date(session.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "expired" }, { status: 410 });
    }
    // Single-use: a code that has already linked a phone cannot be
    // reused by a second phone.
    if (session.phase !== "waiting") {
      return NextResponse.json({ error: "used" }, { status: 409 });
    }

    const { error: upErr } = await adminClient
      .from("tv_sessions")
      .update({
        phase: "linked",
        controller_user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id)
      .eq("phase", "waiting"); // guard against a race: only first wins

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ id: session.id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
