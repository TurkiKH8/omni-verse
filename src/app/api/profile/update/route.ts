import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type Body = {
  full_name?: string;
  email?: string;
  phone?: string;
  new_password?: string;
  current_password?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const { full_name, email, phone, new_password, current_password } = body;

    const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const SERVICE  = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPA_URL || !ANON_KEY || !SERVICE) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    // 1) Identify the caller from cookies (proxy.ts also uses this pattern).
    const cookieStore = await cookies();
    const sb = createServerClient(SUPA_URL, ANON_KEY, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* ignore */ }
        },
      },
    });

    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId       = user.id;
    const currentEmail = user.email ?? "";

    // 2) Decide whether a current-password check is required.
    //    Display-name-only changes do NOT require it; everything else does.
    const wantsEmailChange    = typeof email === "string"        && email.trim().length > 0 && email.trim() !== currentEmail;
    const wantsPhoneChange    = typeof phone === "string"; // we accept "" to clear the phone too
    const wantsPasswordChange = typeof new_password === "string" && new_password.length > 0;
    const sensitive           = wantsEmailChange || wantsPhoneChange || wantsPasswordChange;

    if (sensitive) {
      if (!current_password || current_password.length === 0) {
        return NextResponse.json({ error: "Current password is required to change email, phone, or password." }, { status: 400 });
      }
      // Validate current password by attempting a sign-in. If this succeeds,
      // the password is correct. Use a throwaway client so we don't disturb
      // the caller's session cookies.
      const verifier = createClient(SUPA_URL, ANON_KEY, { auth: { persistSession: false } });
      const { error: vErr } = await verifier.auth.signInWithPassword({ email: currentEmail, password: current_password });
      if (vErr) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
      }
    }

    // 3) Validate new password length up front
    if (wantsPasswordChange && new_password!.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
    }

    // 4) Apply changes using the service-role admin client.
    const admin = createClient(SUPA_URL, SERVICE);

    // 4a) profiles.username + user_metadata.full_name (display name)
    if (typeof full_name === "string" && full_name.trim().length > 0) {
      await admin.from("profiles").update({ username: full_name.trim() }).eq("id", userId);
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: { ...(user.user_metadata ?? {}), full_name: full_name.trim() },
      });
    }

    // 4b) phone -> stored in user_metadata.phone (no schema migration needed)
    if (wantsPhoneChange) {
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: { ...(user.user_metadata ?? {}), phone: phone!.trim() },
      });
    }

    // 4c) email and / or password -> via auth.admin.updateUserById
    const authPatch: { email?: string; password?: string } = {};
    if (wantsEmailChange)    authPatch.email    = email!.trim();
    if (wantsPasswordChange) authPatch.password = new_password!;
    if (Object.keys(authPatch).length > 0) {
      const { error: aErr } = await admin.auth.admin.updateUserById(userId, authPatch);
      if (aErr) {
        return NextResponse.json({ error: aErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
