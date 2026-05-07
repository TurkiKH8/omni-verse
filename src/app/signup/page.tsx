"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password) return;
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    setError("");

    if (!isSupabaseConfigured) {
      setError("Supabase is not configured yet. See setup instructions.");
      setLoading(false);
      return;
    }

    const { data: signUpData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Send welcome email via Resend (fire and forget — don't block signup on this)
    if (signUpData.user) {
      fetch("/api/email/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username: name }),
      }).catch(() => {/* silently ignore if email fails */});
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ backgroundColor: "#120d1f" }}>
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6 py-16 relative z-10">
          <div className="w-full max-w-md text-center flex flex-col items-center gap-5">
            <div className="text-5xl">🎉</div>
            <h2 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>Account Created!</h2>
            <p className="text-sm" style={{ color: "#e8d5a0", opacity: 0.65 }}>
              Welcome to Omni-Verse, <strong style={{ color: "#d4860a" }}>{name}</strong>! You've been gifted <strong style={{ color: "#d4860a" }}>3 free coins</strong> to start playing.
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
            <h1 className="text-3xl font-extrabold" style={{ color: "#e8d5a0" }}>Create Account</h1>
            <p className="text-sm mt-2" style={{ color: "#e8d5a0", opacity: 0.6 }}>Join the Omni-Verse trivia community</p>
          </div>

          <div className="rounded-2xl p-8 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#dc262622", border: "1px solid #dc262644", color: "#f87171" }}>
                {error}
              </div>
            )}

            {[
              { label: "Full Name", value: name, setter: setName, type: "text", placeholder: "Your name" },
              { label: "Email", value: email, setter: setEmail, type: "email", placeholder: "you@example.com" },
              { label: "Password", value: password, setter: setPassword, type: "password", placeholder: "••••••••" },
              { label: "Confirm Password", value: confirm, setter: setConfirm, type: "password", placeholder: "••••••••" },
            ].map((field) => (
              <div key={field.label} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>{field.label}</label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={field.value}
                  onChange={(e) => field.setter(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
                />
              </div>
            ))}

            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full py-3 rounded-full font-bold text-sm mt-1 transition-opacity"
              style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: loading ? 0.5 : 1 }}
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </div>

          <p className="text-center text-sm" style={{ color: "#e8d5a0", opacity: 0.6 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#d4860a" }} className="font-medium">Log In</Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
