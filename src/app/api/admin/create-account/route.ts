import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // 1. Verify the caller is an admin
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!callerProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  // 2. Require service role key for user creation
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not set in .env.local — see setup instructions" },
      { status: 500 }
    );
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { email, password, developerLevel } = await request.json();

  if (!email || !password || !developerLevel) {
    return NextResponse.json({ error: "email, password and developerLevel are required" }, { status: 400 });
  }

  // 3. Create the user (auto-confirmed so they can log in immediately)
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !newUser.user) {
    return NextResponse.json({ error: createError?.message ?? "Failed to create user" }, { status: 400 });
  }

  // 4. Set their profile with developer_level
  const username = email.split("@")[0];
  await adminClient.from("profiles").upsert({
    id: newUser.user.id,
    username,
    is_admin: false,
    developer_level: developerLevel,
  });

  // 5. Log the action
  await supabase.from("audit_log").insert({
    user_email: user.email,
    action: `Created developer account`,
    target: `${email} (${developerLevel})`,
    type: "create",
  });

  return NextResponse.json({ success: true, userId: newUser.user.id });
}
