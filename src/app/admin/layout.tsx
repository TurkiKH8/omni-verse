"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { supabase } from "@/lib/supabase/client";
import { raceWithTimeout, decodeSessionFromStorage } from "@/lib/supabase/withTimeout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname();
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [isAdmin,        setIsAdmin]        = useState(false);
  const [developerLevel, setDeveloperLevel] = useState<string | null>(null);
  const [rank,           setRank]           = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async (userId: string) => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const { data } = await supabase
          .from("profiles")
          .select("is_admin, developer_level, rank")
          .eq("id", userId)
          .abortSignal(ctrl.signal)
          .maybeSingle();
        clearTimeout(t);
        if (cancelled) return;
        setIsAdmin(data?.is_admin ?? false);
        setDeveloperLevel(data?.developer_level ?? null);
        setRank(data?.rank ?? null);
      } catch { /* keep default values */ }
    };

    raceWithTimeout(supabase.auth.getUser(), 4000)
      .then((res) => {
        if (res.data.user) loadProfile(res.data.user.id);
      })
      .catch(() => {
        const recovered = decodeSessionFromStorage();
        if (recovered) loadProfile(recovered.id);
      });

    return () => { cancelled = true; };
  }, []);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#120d1f" }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ backgroundColor: "#00000077" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:static md:translate-x-0 md:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AdminSidebar
          onClose={() => setSidebarOpen(false)}
          isAdmin={isAdmin}
          developerLevel={developerLevel}
          rank={rank}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <div
          className="flex items-center gap-4 px-5 py-4 md:hidden"
          style={{ borderBottom: "1px solid #2e2050", backgroundColor: "#0d091a" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col gap-1.5 p-1"
            aria-label="Open menu"
          >
            <span className="block w-6 h-0.5" style={{ backgroundColor: "#e8d5a0" }} />
            <span className="block w-6 h-0.5" style={{ backgroundColor: "#e8d5a0" }} />
            <span className="block w-6 h-0.5" style={{ backgroundColor: "#e8d5a0" }} />
          </button>
          <div className="flex items-center gap-1">
            <span className="text-base font-extrabold" style={{ color: "#d4860a" }}>Omni</span>
            <span className="text-base font-extrabold" style={{ color: "#e8d5a0" }}>-Verse Admin</span>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
