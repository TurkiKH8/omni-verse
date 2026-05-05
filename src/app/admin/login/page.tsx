"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    if (!isSupabaseConfigured) {
      setError("Supabase is not configured yet.");
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithOtp({ email });

    if (authError) {
      setError(authError.message);
    } else {
      setStage("otp");

      await supabase.from("audit_log").insert({
        user_email: email,
        action: "OTP sent for admin login",
        target: email,
        type: "login",
      });
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (authError) {
      setError("Invalid or expired OTP. Try again.");
    } else {
      await supabase.from("audit_log").insert({
        user_email: email,
        action: "Admin login successful",
        target: email,
        type: "login",
      });
      router.push("/admin/dashboard");
    }
    setLoading(false);
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
            {stage === "email" ? "Enter your admin email to receive an OTP" : `OTP sent to ${email}`}
          </p>
        </div>

        <div className="rounded-2xl p-7 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
          {error && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#dc262622", border: "1px solid #dc262644", color: "#f87171" }}>
              {error}
            </div>
          )}

          {stage === "email" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Email Address</label>
                <input
                  type="email"
                  placeholder="admin@omniverse.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
                  autoFocus
                />
              </div>
              <button
                onClick={handleSendOtp}
                disabled={loading || !email.trim()}
                className="w-full py-3 rounded-full font-bold text-sm transition-opacity"
                style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: loading || !email.trim() ? 0.4 : 1 }}
              >
                {loading ? "Sending…" : "Send OTP"}
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>6-Digit OTP</label>
                <input
                  type="text"
                  placeholder="• • • • • •"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none text-center tracking-widest font-bold"
                  style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0", fontSize: "20px" }}
                  autoFocus
                />
              </div>
              <button
                onClick={handleVerify}
                disabled={loading || otp.length !== 6}
                className="w-full py-3 rounded-full font-bold text-sm transition-opacity"
                style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: loading || otp.length !== 6 ? 0.4 : 1 }}
              >
                {loading ? "Verifying…" : "Verify & Enter"}
              </button>
              <button
                onClick={() => { setStage("email"); setOtp(""); setError(""); }}
                className="text-xs text-center"
                style={{ color: "#e8d5a0", opacity: 0.5 }}
              >
                Use a different email
              </button>
            </>
          )}
        </div>

        <Link href="/" className="text-center text-xs" style={{ color: "#e8d5a0", opacity: 0.4 }}>
          ← Back to site
        </Link>
      </div>
    </div>
  );
}
