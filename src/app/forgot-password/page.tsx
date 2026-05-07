"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const COOLDOWN_SECONDS = 60;

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const linkExpired = searchParams.get("error") === "invalid_link";

  const [email,    setEmail]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error,    setError]    = useState(
    linkExpired ? "That reset link is invalid or has already been used. Request a new one below." : ""
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCooldown = () => {
    setCooldown(COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleReset = async () => {
    if (!email || cooldown > 0) return;
    setLoading(true);
    setError("");

    if (!isSupabaseConfigured) {
      setError("Supabase is not configured yet.");
      setLoading(false);
      return;
    }

    // 1. Check whether this email exists in the database before sending anything
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const { exists } = await res.json();
      if (!exists) {
        setError("No account found with that email address.");
        setLoading(false);
        return;
      }
    } catch {
      // If the check fails for network reasons, proceed anyway
    }

    // 2. Send the reset link
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
      startCooldown();
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold" style={{ color: "#e8d5a0" }}>Reset Password</h1>
        <p className="text-sm mt-2" style={{ color: "#e8d5a0", opacity: 0.6 }}>
          Enter your email and we&apos;ll send you a reset link
        </p>
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
            <p className="text-xs" style={{ color: "#e8d5a0", opacity: 0.55 }}>
              Check your inbox and follow the link to reset your password.
            </p>
            <button
              onClick={() => { setSent(false); setError(""); }}
              disabled={cooldown > 0}
              className="text-xs underline mt-1"
              style={{ color: cooldown > 0 ? "#e8d5a066" : "#d4860a", cursor: cooldown > 0 ? "default" : "pointer" }}
            >
              {cooldown > 0 ? `Resend available in ${cooldown}s` : "Didn't receive it? Resend"}
            </button>
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
              disabled={loading || !email || cooldown > 0}
              className="w-full py-3 rounded-full font-bold text-sm transition-opacity"
              style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: loading || !email || cooldown > 0 ? 0.5 : 1 }}
            >
              {loading ? "Checking…" : cooldown > 0 ? `Wait ${cooldown}s…` : "Send Reset Link"}
            </button>
          </>
        )}
      </div>

      <p className="text-center text-sm" style={{ color: "#e8d5a0", opacity: 0.6 }}>
        Remember your password?{" "}
        <Link href="/login" style={{ color: "#d4860a" }} className="font-medium">Log In</Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ backgroundColor: "#120d1f" }}>
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(-40%, -40%)", opacity: 0.7 }} />
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-16 relative z-10">
        <Suspense fallback={null}>
          <ForgotPasswordForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
