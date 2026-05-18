import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Service-role client — same trusted server-side pattern as
// /api/arena/use-coin. The browser can NEVER grant its own coins;
// every rule (daily target, once-per-day cap, rank reward) is
// enforced here against the database, not the client.
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Higher-tier ranks earn more; everyone is still capped once/day.
const STAFF_RANKS = ["Omni 1", "Omni 2", "Omni 3", "Master Omni"];
const REWARD_STAFF = 6;
const REWARD_DEFAULT = 2;

// Server's own date (UTC YYYY-MM-DD) — the client can't shift it.
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    // The account that earns the coins is ALWAYS the logged-in user
    // (from their login cookie), never an id the browser sends.
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = user.id;

    const { score } = await request.json() as { score: number };

    if (typeof score !== "number" || !Number.isFinite(score) || score < 0) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    // Sanity ceiling so a spoofed absurd score can't poison the best.
    const safeScore = Math.min(Math.floor(score), 100000);

    // Current daily target (fall back to 100 if the row is missing).
    const { data: cfg } = await adminClient
      .from("guardian_config")
      .select("daily_target")
      .eq("id", 1)
      .maybeSingle();
    const target = cfg?.daily_target ?? 100;

    // Player profile: rank (reward tier), coins, current best.
    const { data: profile } = await adminClient
      .from("profiles")
      .select("rank, category_coins, guardian_best")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const prevBest = profile.guardian_best ?? 0;
    const newBest = Math.max(prevBest, safeScore);
    if (newBest !== prevBest) {
      await adminClient.from("profiles").update({ guardian_best: newBest }).eq("id", userId);
    }

    // Already claimed today?
    const day = todayStr();
    const { data: existing } = await adminClient
      .from("guardian_claims")
      .select("coins")
      .eq("user_id", userId)
      .eq("claim_date", day)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        rewarded: false, alreadyClaimed: true, coins: 0,
        best: newBest, target,
      });
    }

    // Did they beat the target this run?
    if (safeScore < target) {
      return NextResponse.json({
        rewarded: false, alreadyClaimed: false, coins: 0,
        best: newBest, target,
      });
    }

    const coins = STAFF_RANKS.includes(profile.rank ?? "") ? REWARD_STAFF : REWARD_DEFAULT;

    // Record the claim FIRST (PK on user_id+date makes a double-submit
    // a harmless duplicate-key failure rather than double coins).
    const { error: claimErr } = await adminClient
      .from("guardian_claims")
      .insert({ user_id: userId, claim_date: day, coins, score: safeScore });
    if (claimErr) {
      // Most likely a race that already inserted today's row → treat
      // as already claimed, never grant twice.
      return NextResponse.json({
        rewarded: false, alreadyClaimed: true, coins: 0,
        best: newBest, target,
      });
    }

    const current = profile.category_coins ?? 0;
    await adminClient
      .from("profiles")
      .update({ category_coins: current + coins })
      .eq("id", userId);

    return NextResponse.json({
      rewarded: true, alreadyClaimed: false, coins,
      best: newBest, target,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
