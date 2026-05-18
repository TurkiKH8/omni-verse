import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, amount } = await request.json() as { userId: string; amount: number };

    // This endpoint only ever SPENDS coins (1 per chosen category). Reject
    // anything that isn't a positive whole number — otherwise a negative
    // amount would slip past the balance check below and ADD coins.
    if (!userId || typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("category_coins")
      .eq("id", userId)
      .maybeSingle();

    const current = profile?.category_coins ?? 0;
    if (current < amount) {
      return NextResponse.json({ error: "Not enough coins" }, { status: 400 });
    }

    await adminClient
      .from("profiles")
      .update({ category_coins: current - amount })
      .eq("id", userId);

    return NextResponse.json({ success: true, remaining: current - amount });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
