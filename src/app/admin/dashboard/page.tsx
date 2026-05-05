"use client";

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

interface Stats {
  categories: number;
  questions: number;
  sessions: number;
  activeCategories: number;
}

interface RecentSession {
  id: string;
  name: string;
  game_mode: string;
  category_names: string[];
  created_at: string;
}

interface TopCategory {
  name: string;
  sessions: number;
  pct: number;
}

const FALLBACK_STATS: Stats = { categories: 12, questions: 72, sessions: 0, activeCategories: 7 };

const FALLBACK_SESSIONS: RecentSession[] = [
  { id: "1", name: "Friday Night Trivia",  game_mode: "team", category_names: ["Science", "History"],  created_at: "2026-05-04T18:00:00Z" },
  { id: "2", name: "Office Showdown",      game_mode: "team", category_names: ["Technology", "Music"], created_at: "2026-05-03T16:00:00Z" },
  { id: "3", name: "Quick Solo Run",       game_mode: "solo", category_names: ["Nature", "Art"],       created_at: "2026-05-03T12:00:00Z" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>(FALLBACK_STATS);
  const [sessions, setSessions] = useState<RecentSession[]>(FALLBACK_SESSIONS);
  const [topCategories, setTopCategories] = useState<TopCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured) { setLoading(false); return; }

      const [catRes, qRes, sessRes] = await Promise.all([
        supabase.from("categories").select("id, active", { count: "exact" }),
        supabase.from("questions").select("id", { count: "exact" }),
        supabase.from("sessions").select("id, name, game_mode, category_names, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      const totalCats   = catRes.count ?? 0;
      const activeCats  = (catRes.data ?? []).filter((c) => c.active).length;
      const totalQ      = qRes.count ?? 0;
      const totalSess   = sessRes.data?.length ?? 0;

      setStats({ categories: totalCats, questions: totalQ, sessions: totalSess, activeCategories: activeCats });
      if (sessRes.data && sessRes.data.length > 0) setSessions(sessRes.data as RecentSession[]);

      // Build top categories from session data
      const allSessions = sessRes.data ?? [];
      const counts: Record<string, number> = {};
      allSessions.forEach((s) => {
        (s.category_names ?? []).forEach((cat: string) => { counts[cat] = (counts[cat] ?? 0) + 1; });
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
      const max = sorted[0]?.[1] ?? 1;
      setTopCategories(sorted.map(([name, n]) => ({ name, sessions: n, pct: Math.round((n / max) * 100) })));

      setLoading(false);
    }
    load();
  }, []);

  const statCards = [
    { label: "Total Categories",   value: stats.categories,       icon: "🗂️", sub: `${stats.activeCategories} active` },
    { label: "Total Questions",    value: stats.questions,         icon: "❓", sub: "in database"  },
    { label: "Sessions Played",    value: stats.sessions,          icon: "🎮", sub: "all time"      },
    { label: "Active Categories",  value: stats.activeCategories,  icon: "✅", sub: "available to play" },
  ];

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: "#e8d5a0", opacity: 0.5 }}>
            {loading ? "Loading live data…" : isSupabaseConfigured ? "Live data from Supabase" : "Demo mode — Supabase not connected"}
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-2xl p-5 flex flex-col gap-3" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-3xl font-extrabold" style={{ color: "#e8d5a0" }}>
                  {loading ? <span className="opacity-30">—</span> : s.value.toLocaleString()}
                </p>
                <p className="text-xs mt-0.5 font-medium" style={{ color: "#e8d5a0", opacity: 0.55 }}>{s.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "#d4860a" }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sessions */}
          <div className="rounded-2xl flex flex-col" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #2e2050" }}>
              <h2 className="font-bold text-sm" style={{ color: "#e8d5a0" }}>Recent Sessions</h2>
            </div>
            {sessions.length === 0 && !loading ? (
              <p className="px-6 py-8 text-sm text-center" style={{ color: "#e8d5a0", opacity: 0.35 }}>No sessions yet. Play the first game!</p>
            ) : (
              sessions.map((s, i) => (
                <div key={s.id} className="px-6 py-3 flex items-center justify-between gap-4" style={{ borderTop: i === 0 ? "none" : "1px solid #2e2050" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#e8d5a0" }}>{s.name}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: "#e8d5a0", opacity: 0.5 }}>
                      {(s.category_names ?? []).join(", ") || "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: "#d4860a22", color: "#d4860a" }}>
                      {s.game_mode}
                    </span>
                    <p className="text-xs mt-1" style={{ color: "#e8d5a0", opacity: 0.4 }}>{fmtDate(s.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Top Categories */}
          <div className="rounded-2xl flex flex-col" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #2e2050" }}>
              <h2 className="font-bold text-sm" style={{ color: "#e8d5a0" }}>Most Played Categories</h2>
            </div>
            {topCategories.length === 0 ? (
              <div className="px-6 py-8 flex flex-col gap-3">
                {["Science", "History", "Geography", "Sports", "Technology", "Music"].map((cat, i) => (
                  <div key={cat} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: "#e8d5a0" }}>{cat}</span>
                      <span className="text-xs" style={{ color: "#e8d5a0", opacity: 0.4 }}>no data yet</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: "#2e2050" }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.max(10, 90 - i * 13)}%`, backgroundColor: "#2e205055" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-4 flex flex-col gap-4">
                {topCategories.map((c) => (
                  <div key={c.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: "#e8d5a0" }}>{c.name}</span>
                      <span className="text-xs" style={{ color: "#e8d5a0", opacity: 0.5 }}>{c.sessions} sessions</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: "#2e2050" }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${c.pct}%`, backgroundColor: "#d4860a" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Add Category", href: "/admin/categories", icon: "➕", color: "#d4860a" },
            { label: "Add Question", href: "/admin/questions",  icon: "✏️", color: "#7c3aed" },
            { label: "View Settings", href: "/admin/settings",  icon: "⚙️", color: "#0ea5e9" },
            { label: "Audit Log",    href: "/admin/audit-log",  icon: "📋", color: "#4ade80" },
          ].map((link) => (
            <a key={link.label} href={link.href} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-opacity hover:opacity-80" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
              <span className="text-xl">{link.icon}</span>
              <span className="text-sm font-medium" style={{ color: link.color }}>{link.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
