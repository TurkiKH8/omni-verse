import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });

    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("id, username, rank, category_coins, is_banned, phone_number, is_admin, developer_level");
    if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 });

    const profileMap = new Map(
      (profiles ?? []).map((p: Record<string, unknown>) => [p.id as string, p])
    );

    const customers = users.map((user) => {
      const p = profileMap.get(user.id) ?? {};
      return {
        id: user.id,
        email: user.email ?? "",
        username: (p as Record<string, unknown>).username ?? "",
        rank: (p as Record<string, unknown>).rank ?? "Omni 1",
        category_coins: (p as Record<string, unknown>).category_coins ?? 0,
        is_banned: (p as Record<string, unknown>).is_banned ?? false,
        phone_number: (p as Record<string, unknown>).phone_number ?? null,
        is_admin: (p as Record<string, unknown>).is_admin ?? false,
        developer_level: (p as Record<string, unknown>).developer_level ?? null,
        created_at: user.created_at,
      };
    });

    return NextResponse.json({ customers });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
