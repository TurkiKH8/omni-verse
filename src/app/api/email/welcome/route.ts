import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, username } = await request.json() as { email: string; username: string };

    const { error } = await resend.emails.send({
      from: "Omni-Verse <onboarding@resend.dev>",
      to: email,
      subject: "Welcome to Omni-Verse! 🎉",
      html: `
        <div style="background:#120d1f;color:#e8d5a0;font-family:sans-serif;padding:40px;max-width:500px;margin:0 auto;border-radius:16px;">
          <h1 style="color:#d4860a;font-size:28px;margin-bottom:4px;">Omni-Verse</h1>
          <p style="color:#e8d5a066;margin-top:0;margin-bottom:32px;">The Ultimate Trivia Experience</p>

          <h2 style="color:#e8d5a0;font-size:20px;">Welcome, ${username}! 👋</h2>
          <p style="line-height:1.6;">You've successfully joined Omni-Verse. Your account is ready and you've been gifted <strong style="color:#d4860a;">3 free coins</strong> to get started.</p>

          <div style="background:#1e1530;border:1px solid #2e2050;border-radius:12px;padding:20px;margin:24px 0;text-align:center;">
            <p style="margin:0;font-size:14px;color:#e8d5a0;opacity:0.7;">Your starting balance</p>
            <p style="margin:8px 0 0;font-size:32px;font-weight:bold;color:#d4860a;">🪙 3 Coins</p>
          </div>

          <p style="line-height:1.6;font-size:14px;color:#e8d5a066;">Each coin lets you select one category in the Arena. Head to the arena and start playing!</p>

          <a href="https://omni-verse.vercel.app/arena" style="display:inline-block;background:#d4860a;color:#120d1f;font-weight:bold;padding:12px 28px;border-radius:9999px;text-decoration:none;margin-top:16px;">
            Enter the Arena →
          </a>

          <p style="margin-top:40px;font-size:12px;color:#e8d5a033;">You're receiving this because you signed up at Omni-Verse</p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
