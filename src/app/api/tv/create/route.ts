import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Service-role client — same trusted server-side pattern as
// /api/arena/use-coin and /api/guardian/claim. Only this server
// route may create a pairing row; the browser never writes the
// tv_sessions table directly (no INSERT policy exists for it).
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// A fresh random 4-digit code (0000–9999). Short on purpose so it is
// easy to read off a TV across a room — safe because it is single-use,
// expires in 15 minutes, and only ever links ONE phone.
function newCode() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

// Called by the TV page (omni-verse.shop/tv) when it opens. Creates a
// brand-new waiting session with a unique code and returns it so the
// TV can show it big on screen.
export async function POST() {
  try {
    // Generate a code that is not currently in use by another active
    // (not-ended) session. The partial unique index guarantees no clash;
    // we retry a few times in the very unlikely event of a collision.
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = newCode();
      const { data, error } = await adminClient
        .from("tv_sessions")
        .insert({ code, phase: "waiting" })
        .select("id, code")
        .single();

      if (!error && data) {
        return NextResponse.json({ id: data.id, code: data.code });
      }
      // 23505 = unique_violation → that code is taken, try another.
      if (error && error.code !== "23505") {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    return NextResponse.json(
      { error: "Could not allocate a free code, please try again." },
      { status: 503 }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
