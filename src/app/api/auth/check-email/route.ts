import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({}));

  if (!email || typeof email !== "string") {
    return NextResponse.json({ exists: false }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    // Can't check — let the flow continue rather than blocking the user
    return NextResponse.json({ exists: true });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // listUsers fetches all users; for this scale (trivia game) this is fine.
  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    // Fail open — don't block the user if the admin check fails
    return NextResponse.json({ exists: true });
  }

  const exists = data.users.some(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  return NextResponse.json({ exists });
}
