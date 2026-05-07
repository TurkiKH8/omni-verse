"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

function EyeOpen() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOff() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function AdminLoginPage() {
  const router   = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");

    if (!isSupabaseConfigured) {
      setError("Supabase is not configured yet.");
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !data.user) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, developer_level")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile?.is_admin && !profile?.developer_level) {
      await supabase.auth.signOut();
      setError("Access denied. This account does not have admin or developer privileges.");
      setLoading(false);
      return;
    }

    await supabase.from("audit_log").insert({
      user_email: email,
      action: "Admin login successful",
      target: profile.is_admin ? "Admin" : `Developer (${profile.developer_level})`,
      type: "login",
    });

    router.push("/admin/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#0d091a" }}>
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-3">
            <span className="text-2xl font-extrabold" style={{ color: "#d4860a" }}>Omni</span>
            <span className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>-Verse</span>
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>Admin Access</h1>
          <p className="text-sm mt-1" style={{ color: "#e8d5a0", opacity: 0.55 }}>
            Authorised personnel only
          </p>
        </div>

        <div className="rounded-2xl p-7 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
          {error && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#dc262622", border: "1px solid #dc262644", color: "#f87171" }}>
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none"
                style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-100"
                style={{ color: "#e8d5a0", opacity: 0.45 }}
                tabIndex={-1}
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? <EyeOff /> : <EyeOpen />}
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading || !email.trim() || !password}
            className="w-full py-3 rounded-full font-bold text-sm transition-opacity"
            style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: loading || !email.trim() || !password ? 0.4 : 1 }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </div>

        <Link href="/" className="text-center text-xs" style={{ color: "#e8d5a0", opacity: 0.4 }}>
          ← Back to site
        </Link>
      </div>
    </div>
  );
}
