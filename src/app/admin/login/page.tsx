"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router   = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
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

    // Verify this account has admin or developer access
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
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
            />
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
