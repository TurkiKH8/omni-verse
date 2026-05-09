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

    // Creates the user and returns a confirmation link in one call
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        data: { full_name },
        redirectTo: `${siteUrl}/welcome`,
      },
    });

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 400 });
    }

    const userId = linkData.user.id;
    // Bypass Supabase's action_link (which uses whatever Site URL is configured
    // in the Supabase dashboard) and route confirmation through our own domain.
    // The /auth/confirm route handler verifies the token_hash via verifyOtp and
    // then redirects to `next` (here: /welcome).
    const confirmUrl = `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}&type=signup&next=${encodeURIComponent("/welcome")}`;
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
