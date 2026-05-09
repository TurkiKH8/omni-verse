import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name } = await request.json();

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const siteUrl = "https://omni-verse.shop";

    // 1) Create the user as already-confirmed. This is the key step that
    //    prevents Supabase from auto-sending its built-in "Confirm signup"
    //    email — we want only our custom Resend email to reach the inbox.
    //    (Previous code used generateLink({type:"signup"}) which both
    //    creates the user AND triggers Supabase's confirmation mailer,
    //    producing two emails per signup.)
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError || !createData.user) {
      return NextResponse.json({ error: createError?.message ?? "Could not create account." }, { status: 400 });
    }

    const userId = createData.user.id;

    // 2) Generate a magic-link token for the "Confirm My Account" button.
    //    generateLink with type "magiclink" only creates and returns the
    //    token — it never sends an email itself.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError || !linkData.properties?.hashed_token) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: linkError?.message ?? "Could not generate confirmation link." }, { status: 500 });
    }

    // Route confirmation through our own /auth/confirm endpoint on
    // omni-verse.shop. It verifies the token_hash via supabase.auth.verifyOtp
    // and redirects to /welcome with the session installed.
    const confirmUrl = `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}&type=magiclink&next=${encodeURIComponent("/welcome")}`;
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Email service is not configured." }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    const { error: emailError } = await resend.emails.send({
      from:    "Omni-Verse <noreply@omni-verse.shop>",
      to:      email,
      subject: "Confirm your Omni-Verse account ✉️",
      html: `
        <div style="background:#120d1f;color:#e8d5a0;font-family:sans-serif;padding:40px;max-width:520px;margin:0 auto;border-radius:16px;border:1px solid #2e2050;">
          <div style="margin-bottom:32px;">
            <span style="font-size:22px;font-weight:900;color:#d4860a;">Omni</span>
            <span style="font-size:22px;font-weight:900;color:#e8d5a0;">-Verse</span>
          </div>
          <h2 style="margin:0 0 12px;font-size:22px;color:#e8d5a0;">Welcome, ${full_name}! 👋</h2>
          <p style="margin:0 0 8px;line-height:1.7;opacity:0.75;">
            You're one step away from joining the Omni-Verse trivia community.
            Click the button below to confirm your email and activate your account.
          </p>
          <p style="margin:0 0 28px;line-height:1.7;opacity:0.75;">
            You'll also receive <strong style="color:#d4860a;">3 free coins</strong> to start playing right away.
          </p>
          <a href="${confirmUrl}"
             style="display:inline-block;background:#d4860a;color:#120d1f;font-weight:700;font-size:15px;padding:14px 32px;border-radius:9999px;text-decoration:none;">
            Confirm My Account →
          </a>
          <p style="margin-top:32px;font-size:12px;opacity:0.35;line-height:1.6;">
            This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (emailError) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: emailError.message }, { status: 500 });
    }

    return NextResponse.json({ userId, emailSent: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
