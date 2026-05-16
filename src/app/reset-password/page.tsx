"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword]   = useState("");
  const [confirm,  setConfirm]    = useState("");
  const [saving,   setSaving]     = useState(false);
  const [error,    setError]      = useState("");
  const [done,     setDone]       = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm)  { setError("Passwords do not match."); return; }
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
    } else {
      setDone(true);
      setTimeout(() => router.push("/admin/login"), 2500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "transparent" }}>
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Logo */}
        <div className="text-center">
          <span className="text-2xl font-extrabold" style={{ color: "#d4860a" }}>Omni</span>
          <span className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>-Verse</span>
          <p className="text-sm mt-1" style={{ color: "#e8d5a0", opacity: 0.45 }}>Set a new password</p>
        </div>

        <div className="rounded-2xl p-7 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>

          {done ? (
            <div className="text-center py-4">
              <p className="text-lg font-bold" style={{ color: "#d4860a" }}>Password updated!</p>
              <p className="text-sm mt-2" style={{ color: "#e8d5a0", opacity: 0.6 }}>Redirecting you to login…</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#dc262622", border: "1px solid #dc262644", color: "#f87171" }}>
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Type it again"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={saving || !password || !confirm}
                className="w-full py-3 rounded-full text-sm font-bold"
                style={{
                  backgroundColor: "#d4860a",
                  color: "#120d1f",
                  opacity: saving || !password || !confirm ? 0.4 : 1,
                }}
              >
                {saving ? "Saving…" : "Set New Password"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
