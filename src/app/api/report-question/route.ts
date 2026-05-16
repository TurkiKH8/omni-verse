import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { question, category, points, reason, otherText, email, phone } =
      await request.json() as {
        question: string;
        category: string;
        points: number;
        reason: string;
        otherText?: string;
        email: string;
        phone: string;
      };

    if (!reason || !email) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Email not configured." }, { status: 503 });

    const resend = new Resend(apiKey);
    const detail = reason === "other" && otherText ? `Other: ${otherText}` : reason;

    const { error } = await resend.emails.send({
      // Free Resend plan has no verified custom domain yet, so we must send
      // from the shared onboarding@resend.dev sender (same one the working
      // signup-confirmation emails use). Switch to noreply@omni-verse.shop
      // only after the domain is verified in Resend.
      from:    "Omni-Verse Reports <onboarding@resend.dev>",
      to:      "turkinalkhaldi@gmail.com",
      replyTo: email,
      subject: `⚠️ Question Report — ${category} (${points} pts)`,
      html: `
        <div style="background:#120d1f;color:#e8d5a0;font-family:sans-serif;padding:32px;max-width:520px;margin:0 auto;border-radius:16px;border:1px solid #2e2050;">
          <h2 style="color:#f87171;margin:0 0 20px;">⚠️ Question Report</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 0;color:#e8d5a066;width:120px;">Category</td><td style="padding:6px 0;color:#a78bfa;">${category}</td></tr>
            <tr><td style="padding:6px 0;color:#e8d5a066;">Points</td><td style="padding:6px 0;color:#d4860a;">${points} pts</td></tr>
            <tr><td style="padding:6px 0;color:#e8d5a066;">Question</td><td style="padding:6px 0;">${question}</td></tr>
            <tr><td style="padding:6px 0;color:#e8d5a066;">Issue</td><td style="padding:6px 0;color:#f87171;font-weight:bold;">${detail}</td></tr>
            <tr><td style="padding:6px 0;color:#e8d5a066;">Reporter Email</td><td style="padding:6px 0;">${email}</td></tr>
            <tr><td style="padding:6px 0;color:#e8d5a066;">Reporter Phone</td><td style="padding:6px 0;">${phone || "—"}</td></tr>
          </table>
        </div>
      `,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
