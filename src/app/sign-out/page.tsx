"use client";

import { useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export default function SignOutPage() {
  useEffect(() => {
    let done = false;

    const go = () => {
      if (!done) { done = true; window.location.href = "/"; }
    };

    // Hard deadline — redirect after 3 seconds no matter what
    const timer = setTimeout(go, 3000);

    const clear = async () => {
      try {
        if (isSupabaseConfigured) await supabase.auth.signOut();
      } catch { /* ignore */ }
      clearTimeout(timer);
      go();
    };

    clear();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#120d1f" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: "#d4860a", borderTopColor: "transparent" }} />
        <p className="text-sm" style={{ color: "#e8d5a0", opacity: 0.6 }}>Signing you out…</p>
      </div>
    </div>
  );
}
