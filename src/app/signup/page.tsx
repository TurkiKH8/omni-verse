"use client";

import { useState } from "react";
import Link from "next/link";
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

export default function SignupPage() {
  const { t } = useLanguage();
  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState(false);
  const [checkEmail,   setCheckEmail]   = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password) return;
    if (password !== confirm) { setError(t.signup.passMismatch); return; }
    if (password.length < 6)  { setError(t.signup.passShort);    return; }
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: name }),
    });

    const result = await res.json();

    if (!res.ok) {
      setError(result.error || t.signup.tryAgain);
      setLoading(false);
      return;
    }

    // Only the confirmation email (sent by /api/auth/signup via Resend)
    // should reach the inbox. The previous /api/email/welcome trigger
    // produced a second "Enter the Arena" email — removed.

    setCheckEmail(true);
    setLoading(false);
  };

  if (checkEmail) {
    return (
      <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ backgroundColor: "#120d1f" }}>
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6 py-16 relative z-10">
          <div className="w-full max-w-md text-center flex flex-col items-center gap-5">
            <div className="text-5xl">📧</div>
            <h2 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>{t.signup.checkInbox}</h2>
            <p className="text-sm leading-relaxed" style={{ color: "#e8d5a0", opacity: 0.65 }}>
              {t.signup.sentLinkA}{" "}
              <strong style={{ color: "#d4860a" }}>{email}</strong>.<br />
              {t.signup.sentLinkB}{" "}
              <strong style={{ color: "#d4860a" }}>{t.signup.freeCoins}</strong>.
            </p>
            <p className="text-xs" style={{ color: "#e8d5a0", opacity: 0.4 }}>
              {t.signup.checkSpam}
            </p>
            <Link href="/login" className="px-8 py-3 rounded-full font-bold text-sm" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>
              {t.signup.goLogin}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ backgroundColor: "#120d1f" }}>
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6 py-16 relative z-10">
          <div className="w-full max-w-md text-center flex flex-col items-center gap-5">
            <div className="text-5xl">🎉</div>
            <h2 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>Account Created!</h2>
            <p className="text-sm leading-relaxed" style={{ color: "#e8d5a0", opacity: 0.65 }}>
              Welcome to Omni-Verse, <strong style={{ color: "#d4860a" }}>{name}</strong>!<br />
              You&apos;ve been gifted <strong style={{ color: "#d4860a" }}>3 free coins</strong> to start playing.
            </p>
            <Link href="/login" className="px-8 py-3 rounded-full font-bold text-sm" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>
              Log In Now →
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ backgroundColor: "#120d1f" }}>
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(40%, -40%)", opacity: 0.7 }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(-40%, 40%)", opacity: 0.7 }} />

      <Navbar />

      <main className="flex-1 flex items-center justify-center px-6 py-16 relative z-10">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold" style={{ color: "#e8d5a0" }}>{t.signup.title}</h1>
            <p className="text-sm mt-2" style={{ color: "#e8d5a0", opacity: 0.6 }}>{t.signup.subtitle}</p>
          </div>

          <div className="rounded-2xl p-8 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#dc262622", border: "1px solid #dc262644", color: "#f87171" }}>
                {error}
              </div>
            )}

            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>{t.signup.fullName}</label>
              <input
                type="text"
                placeholder={t.signup.yourName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>{t.signup.email}</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>{t.signup.password}</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>{t.signup.confirmPass}</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                  className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-100"
                  style={{ color: "#e8d5a0", opacity: 0.45 }}
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full py-3 rounded-full font-bold text-sm mt-1 transition-opacity"
              style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: loading ? 0.5 : 1 }}
            >
              {loading ? t.signup.creating : t.signup.create}
            </button>
          </div>

          <p className="text-center text-sm" style={{ color: "#e8d5a0", opacity: 0.6 }}>
            {t.signup.haveAccount}{" "}
            <Link href="/login" style={{ color: "#d4860a" }} className="font-medium">{t.signup.logInLink}</Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
