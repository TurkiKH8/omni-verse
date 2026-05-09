"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/components/LanguageProvider";

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

function LoginForm() {
  const searchParams = useSearchParams();
  const next         = searchParams.get("next") ?? "/";
  const { t }        = useLanguage();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError("");

    const ctrl = new AbortController();
    const hangGuard = setTimeout(() => { ctrl.abort(); }, 5000);

    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: ctrl.signal,
      });
      clearTimeout(hangGuard);

      const data = await resp.json() as { access_token?: string; refresh_token?: string; error?: string };

      if (!resp.ok || !data.access_token) {
        const msg = (data.error || "").toLowerCase();
        if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
          setError("Please check your email and click the confirmation link before logging in.");
        } else if (msg.includes("invalid") || msg.includes("credentials")) {
          setError("Incorrect email or password. Please try again.");
        } else if (msg.includes("timed out")) {
          setError("Login is taking too long — please try again in a moment.");
        } else {
          setError(data.error || "Login failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      // Race setSession against a 5s timeout so an orphaned auth lock can't hang us
      await Promise.race([
        supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token!,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("setSession timeout")), 5000)),
      ]).catch(() => {
        // If setSession hangs, write tokens directly so the next page can pick them up
        const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(/https?:\/\/([^.]+)\./)?.[1];
        if (projectRef && typeof window !== "undefined") {
          const session = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            token_type: "bearer",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          };
          window.localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(session));
        }
      });

      window.location.href = next;
    } catch (err: unknown) {
      clearTimeout(hangGuard);
      const e = err as { name?: string };
      if (e.name === "AbortError") {
        setError("Login timed out after 5 seconds — please try again.");
      } else {
        setError("Connection error — please check your internet and try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold" style={{ color: "#e8d5a0" }}>{t.login.welcome}</h1>
        <p className="text-sm mt-2" style={{ color: "#e8d5a0", opacity: 0.6 }}>{t.login.subtitle}</p>
      </div>

      <div className="rounded-2xl p-8 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
        {error && (
          <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#dc262622", border: "1px solid #dc262644", color: "#f87171" }}>
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>{t.login.email}</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>{t.login.password}</label>
            <Link href="/forgot-password" className="text-xs" style={{ color: "#d4860a" }}>{t.login.forgotPass}</Link>
          </div>
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
          disabled={loading || !email || !password}
          className="w-full py-3 rounded-full font-bold text-sm mt-1 transition-opacity"
          style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: loading || !email || !password ? 0.5 : 1 }}
        >
          {loading ? t.login.loggingIn : t.login.logIn}
        </button>
      </div>

      <p className="text-center text-sm" style={{ color: "#e8d5a0", opacity: 0.6 }}>
        {t.login.noAccount}{" "}
        <Link href="/signup" style={{ color: "#d4860a" }} className="font-medium">{t.login.signUpLink}</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ backgroundColor: "#120d1f" }}>
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(-40%, -40%)", opacity: 0.7 }} />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(40%, 40%)", opacity: 0.7 }} />
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-16 relative z-10">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
