"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    if (!email) return;
    setLoading(true);
    setError("");

    if (!isSupabaseConfigured) {
      setError("Supabase is not configured yet.");
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ backgroundColor: "#120d1f" }}>
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(-40%, -40%)", opacity: 0.7 }} />

      <Navbar />

      <main className="flex-1 flex items-center justify-center px-6 py-16 relative z-10">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold" style={{ color: "#e8d5a0" }}>Reset Password</h1>
            <p className="text-sm mt-2" style={{ color: "#e8d5a0", opacity: 0.6 }}>Enter your email and we&apos;ll send you a reset link</p>
          </div>

          <div className="rounded-2xl p-8 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#dc262622", border: "1px solid #dc262644", color: "#f87171" }}>
                {error}
              </div>
            )}
            {sent ? (
              <div className="text-center flex flex-col gap-3 py-4">
                <div className="text-4xl">📧</div>
                <p className="text-sm font-medium" style={{ color: "#4ade80" }}>Reset link sent to {email}</p>
                <p className="text-xs" style={{ color: "#e8d5a0", opacity: 0.55 }}>Check your inbox and follow the link to reset your password.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleReset()}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleReset}
                  disabled={loading || !email}
                  className="w-full py-3 rounded-full font-bold text-sm transition-opacity"
                  style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: loading || !email ? 0.5 : 1 }}
                >
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </>
            )}
          </div>

          <p className="text-center text-sm" style={{ color: "#e8d5a0", opacity: 0.6 }}>
            Remember your password?{" "}
            <Link href="/login" style={{ color: "#d4860a" }} className="font-medium">Log In</Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
