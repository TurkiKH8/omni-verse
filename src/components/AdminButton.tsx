"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

const STAFF_RANKS = ["Omni 1", "Omni 2", "Omni 3", "Master Omni"];

export default function AdminButton() {
  const [rank,    setRank]    = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("rank")
        .eq("id", session.user.id)
        .maybeSingle();
      setRank(data?.rank ?? "Default");
      setVisible(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("rank")
          .eq("id", session.user.id)
          .maybeSingle();
        setRank(data?.rank ?? "Default");
        setVisible(true);
      } else {
        setVisible(false);
        setRank(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!visible) return null;

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
