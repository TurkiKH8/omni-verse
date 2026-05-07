import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, email, value } = body as {
      action: string;
      userId: string;
      email: string;
      value?: string;
    };

    switch (action) {
      case "ban": {
        await adminClient.auth.admin.updateUserById(userId, { ban_duration: "87600h" });
        await adminClient.from("profiles").update({ is_banned: true }).eq("id", userId);
        return NextResponse.json({ success: true });
      }

      case "unban": {
        await adminClient.auth.admin.updateUserById(userId, { ban_duration: "none" });
        await adminClient.from("profiles").update({ is_banned: false }).eq("id", userId);
        return NextResponse.json({ success: true });
      }

      case "delete": {
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ success: true });
      }

      case "reset_password": {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
        const { error } = await adminClient.auth.resetPasswordForEmail(email, {
          redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ success: true });
      }

      case "change_email": {
        const { error } = await adminClient.auth.admin.updateUserById(userId, { email: value });
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ success: true });
      }

      case "change_phone": {
        await adminClient.from("profiles").update({ phone_number: value }).eq("id", userId);
        return NextResponse.json({ success: true });
      }

      case "change_display_name": {
        await adminClient.from("profiles").update({ username: value }).eq("id", userId);
        return NextResponse.json({ success: true });
      }

      case "add_coins": {
        const { data } = await adminClient
          .from("profiles")
          .select("category_coins")
          .eq("id", userId)
          .maybeSingle();
        const current = (data?.category_coins as number) ?? 0;
        const add = parseInt(value ?? "0");
        if (data) {
          await adminClient
            .from("profiles")
            .update({ category_coins: current + add })
            .eq("id", userId);
        } else {
          await adminClient
            .from("profiles")
            .insert({ id: userId, category_coins: add, rank: "Default" });
        }
        return NextResponse.json({ success: true });
      }

      case "change_rank": {
        await adminClient.from("profiles").update({ rank: value }).eq("id", userId);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
