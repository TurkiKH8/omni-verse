import { NextResponse } from "next/server";

// This endpoint is intentionally a no-op. It used to fire a second
// "Welcome / Enter the Arena" Resend email after signup, which produced
// two emails per signup (and hardcoded the wrong omni-verse.vercel.app
// URL). The signup confirmation email is now the only email sent and
// it goes out from /api/auth/signup.
//
// The route is kept (not deleted) so any cached browser still posting
// here gets a 200 instead of a 404. No email is ever dispatched.
export async function POST() {
  return NextResponse.json({ success: true, noop: true });
}
