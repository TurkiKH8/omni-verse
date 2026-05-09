"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { raceWithTimeout, decodeSessionFromStorage } from "@/lib/supabase/withTimeout";

const STAFF_RANKS = ["Omni 1", "Omni 2", "Omni 3", "Master Omni"];

export default function AdminButton() {
  const pathname = usePathname();
  const [rank,    setRank]    = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Hide entirely inside the admin portal — the sidebar's "Back to Site"
  // sits at the same bottom-left position and we'd cover it.
  const onAdminPage = pathname?.startsWith("/admin") ?? false;

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;

    const showAndLoadRank = async (userId: string) => {
      if (cancelled) return;
      // Show the button immediately so it can never disappear silently
      setVisible(true);

      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const { data } = await supabase
          .from("profiles")
          .select("rank")
          .eq("id", userId)
          .abortSignal(ctrl.signal)
          .maybeSingle();
        clearTimeout(t);
        if (cancelled) return;
        setRank(data?.rank ?? "Default");
      } catch {
        setRank("Default");
      }
    };

    // Initial check: getSession with a 4s timeout, then localStorage fallback
    raceWithTimeout(supabase.auth.getSession(), 4000)
      .then((res) => {
        const session = res.data.session;
        if (session?.user) showAndLoadRank(session.user.id);
      })
      .catch(() => {
        const recovered = decodeSessionFromStorage();
        if (recovered) showAndLoadRank(recovered.id);
      });

    // React to login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (cancelled) return;
      if (session?.user) {
        showAndLoadRank(session.user.id);
      } else {
        setVisible(false);
        setRank(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (!visible || onAdminPage) return null;

  const isStaff = rank !== null && STAFF_RANKS.includes(rank);

  if (isStaff) {
    return (
      <Link
        href="/admin/dashboard"
        title="Admin Panel"
        className="fixed bottom-5 left-5 z-40 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-opacity hover:opacity-100"
        style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0", opacity: 0.6 }}
      >
        ⚙️ Admin
      </Link>
    );
  }

  return (
    <div
      title="Staff access only"
      className="fixed bottom-5 left-5 z-40 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold select-none"
      style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0", opacity: 0.2, cursor: "not-allowed" }}
    >
      ⚙️ Admin
    </div>
  );
}
