"use client";

import { useEffect, useState, useCallback } from "react";
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

interface RecentQuestion {
  id: string;
  question_en: string;
  answer_en: string;
  points: number;
  created_at: string;
  created_by?: string | null;
  categories?: { name_en: string } | null;
}

interface RecentCategory {
  id: string;
  name_en: string;
  name_ar: string;
  created_at: string;
  created_by?: string | null;
}

// Content-health alerts shown on the dashboard.
interface DupGroup {
  lang: "EN" | "AR";
  text: string;
  where: { cat: string; idx: number | null }[];
}
interface ThinCat {
  name: string;
  questions: number;
  usage: number;
}

// Zeros on first paint so we NEVER flash fake numbers. Real values arrive
// from the live read a moment later. Demo mode (no Supabase) uses DEMO_STATS.
const ZERO_STATS: Stats = { categories: 0, questions: 0, sessions: 0, activeCategories: 0 };
const DEMO_STATS: Stats = { categories: 12, questions: 72, sessions: 0, activeCategories: 7 };

const FALLBACK_SESSIONS: RecentSession[] = [
  { id: "1", name: "Friday Night Trivia",  game_mode: "team", category_names: ["Science", "History"],  created_at: "2026-05-04T18:00:00Z" },
  { id: "2", name: "Office Showdown",      game_mode: "team", category_names: ["Technology", "Music"], created_at: "2026-05-03T16:00:00Z" },
  { id: "3", name: "Quick Solo Run",       game_mode: "solo", category_names: ["Nature", "Art"],       created_at: "2026-05-03T12:00:00Z" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>(isSupabaseConfigured ? ZERO_STATS : DEMO_STATS);
  const [sessions, setSessions] = useState<RecentSession[]>(isSupabaseConfigured ? [] : FALLBACK_SESSIONS);
  const [topCategories, setTopCategories] = useState<TopCategory[]>([]);
  const [recentQuestions, setRecentQuestions] = useState<RecentQuestion[]>([]);
  const [recentCategories, setRecentCategories] = useState<RecentCategory[]>([]);
  const [dupGroups, setDupGroups] = useState<DupGroup[]>([]);
  const [thinCats, setThinCats] = useState<ThinCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hasGoodData, setHasGoodData] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }

    setLoading(true);
    setLoadError("");
    try {
      // True totals straight from the DB. head:true asks Postgres for ONLY
      // the count (no rows shipped) so it is always exact and never capped.
      const [
        catCountRes, qCountRes, activeCatRes, sessCountRes,
        sessRes, recentQRes, recentCatRes, allSessRes, allQRes, catFullRes,
      ] = await Promise.all([
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase.from("questions").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }).eq("active", true),
        supabase.from("sessions").select("*", { count: "exact", head: true }),
        supabase.from("sessions").select("id, name, game_mode, category_names, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("questions").select("id, question_en, answer_en, points, created_at, created_by, categories(name_en)").order("created_at", { ascending: false }).limit(5),
        supabase.from("categories").select("id, name_en, name_ar, created_at, created_by").order("created_at", { ascending: false }).limit(5),
        supabase.from("sessions").select("category_names"),
        // Full bank for duplicate detection (id + q_index + both texts).
        supabase.from("questions").select("id, q_index, question_en, question_ar, categories(name_en)"),
        // Every category with its question count for the thin-category alert.
        supabase.from("categories").select("name_en, question_count, is_hidden"),
      ]);

      // If the core count queries errored, treat this whole refresh as failed
      // and keep the last good numbers (don't overwrite with zeros/fakes).
      if (catCountRes.error || qCountRes.error) {
        throw new Error(catCountRes.error?.message || qCountRes.error?.message || "count query failed");
      }

      setStats({
        categories:       catCountRes.count ?? 0,
        questions:        qCountRes.count ?? 0,
        sessions:         sessCountRes.count ?? 0,
        activeCategories: activeCatRes.count ?? 0,
      });

      if (sessRes.data && sessRes.data.length > 0) setSessions(sessRes.data as unknown as RecentSession[]);

      // The "recent" panels select created_by, which may not exist on an
      // un-migrated DB. If that errored, retry without it so the lists still fill.
      if (recentQRes.data) {
        setRecentQuestions(recentQRes.data as unknown as RecentQuestion[]);
      } else {
        const retry = await supabase.from("questions").select("id, question_en, answer_en, points, created_at, categories(name_en)").order("created_at", { ascending: false }).limit(5);
        if (retry.data) setRecentQuestions(retry.data as unknown as RecentQuestion[]);
      }
      if (recentCatRes.data) {
        setRecentCategories(recentCatRes.data as unknown as RecentCategory[]);
      } else {
        const retry = await supabase.from("categories").select("id, name_en, name_ar, created_at").order("created_at", { ascending: false }).limit(5);
        if (retry.data) setRecentCategories(retry.data as unknown as RecentCategory[]);
      }

      // Build top categories from ALL session data
      const allSessions = allSessRes.data ?? [];
      const counts: Record<string, number> = {};
      allSessions.forEach((s) => {
        (s.category_names ?? []).forEach((cat: string) => { counts[cat] = (counts[cat] ?? 0) + 1; });
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const max = sorted[0]?.[1] ?? 1;
      setTopCategories(sorted.map(([name, n]) => ({ name, sessions: n, pct: Math.round((n / max) * 100) })));

      // ── Content alert: duplicate questions across the whole bank ──────────
      type RawQ = { id: string; q_index: number | null; question_en: string; question_ar: string | null; categories: { name_en: string } | null };
      const allQ = (allQRes.data ?? []) as unknown as RawQ[];
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
      const groupByLang = (lang: "EN" | "AR"): DupGroup[] => {
        const m = new Map<string, { text: string; where: { cat: string; idx: number | null }[] }>();
        for (const q of allQ) {
          const raw = (lang === "EN" ? q.question_en : (q.question_ar ?? "")) ?? "";
          const key = norm(raw);
          if (!key) continue;
          const entry = m.get(key) ?? { text: raw.trim(), where: [] };
          entry.where.push({ cat: q.categories?.name_en ?? "—", idx: q.q_index ?? null });
          m.set(key, entry);
        }
        return [...m.values()]
          .filter((g) => g.where.length > 1)
          .map((g) => ({ lang, text: g.text, where: g.where }));
      };
      setDupGroups([...groupByLang("EN"), ...groupByLang("AR")]);

      // ── Content alert: thin categories (high demand, low bank) ───────────
      type RawCat = { name_en: string; question_count: number | null; is_hidden?: boolean | null };
      const fullCats = (catFullRes.data ?? []) as RawCat[];
      const thin = fullCats
        .filter((c) => !c.is_hidden && (c.question_count ?? 0) < 24)
        .map((c) => ({ name: c.name_en, questions: c.question_count ?? 0, usage: counts[c.name_en] ?? 0 }))
        .sort((a, b) => b.usage - a.usage || a.questions - b.questions);
      setThinCats(thin);

      setHasGoodData(true);
      setLastUpdated(new Date());
    } catch (e) {
      // Refresh failed — keep the last good numbers on screen (your words:
      // "read the latest until another update replaces it"). Just flag it.
      setLoadError(e instanceof Error ? e.message : "Could not reach the database. Showing the last numbers I have.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Read on first open.
  useEffect(() => { load(); }, [load]);

  // Re-read every time you come back to this tab/window, so the numbers are
  // never stale — and they only change when a fresh read succeeds.
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

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
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: "#e8d5a0", opacity: 0.5 }}>
              {loading
                ? "Reading the latest numbers…"
                : !isSupabaseConfigured
                  ? "Demo mode — Supabase not connected"
                  : lastUpdated
                    ? `Live · updated ${lastUpdated.toLocaleTimeString("en-US")}`
                    : "Live data from Supabase"}
            </p>
          </div>
          {isSupabaseConfigured && (
            <button
              onClick={() => load()}
              disabled={loading}
              className="px-4 py-2.5 rounded-full text-sm font-bold hover:opacity-90"
              style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: loading ? 0.5 : 1, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Refreshing…" : "🔄 Refresh"}
            </button>
          )}
        </div>

        {loadError && (
          <p className="text-sm rounded-xl px-4 py-3" style={{ color: "#fca5a5", backgroundColor: "#dc262622", border: "1px solid #dc262655" }}>
            Couldn’t refresh just now: {loadError} — showing the last numbers I successfully read.
          </p>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-2xl p-5 flex flex-col gap-3" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-3xl font-extrabold" style={{ color: "#e8d5a0" }}>
                  {loading && !hasGoodData && isSupabaseConfigured ? <span className="opacity-30">—</span> : s.value.toLocaleString()}
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

        {/* Last 5 added questions + last 5 added categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Last 5 Questions */}
          <div className="rounded-2xl flex flex-col" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #2e2050" }}>
              <h2 className="font-bold text-sm" style={{ color: "#e8d5a0" }}>Last 5 Added Questions</h2>
            </div>
            {recentQuestions.length === 0 ? (
              <p className="px-6 py-8 text-sm text-center" style={{ color: "#e8d5a0", opacity: 0.35 }}>No questions added yet.</p>
            ) : (
              recentQuestions.map((q, i) => (
                <div key={q.id} className="px-6 py-3 flex flex-col gap-1" style={{ borderTop: i === 0 ? "none" : "1px solid #2e2050" }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44" }}>
                      {(q.categories as { name_en: string } | null)?.name_en ?? "—"}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#d4860a22", color: "#d4860a" }}>{q.points} pts</span>
                  </div>
                  <p className="text-sm font-medium truncate" style={{ color: "#e8d5a0" }}>{q.question_en}</p>
                  <p className="text-xs truncate" style={{ color: "#4ade80", opacity: 0.8 }}>✓ {q.answer_en}</p>
                  <p className="text-xs" style={{ color: "#e8d5a0", opacity: 0.35 }}>{fmtDate(q.created_at)}{q.created_by ? ` · by ${String(q.created_by).slice(0, 8)}…` : ""}</p>
                </div>
              ))
            )}
          </div>

          {/* Last 5 Categories */}
          <div className="rounded-2xl flex flex-col" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #2e2050" }}>
              <h2 className="font-bold text-sm" style={{ color: "#e8d5a0" }}>Last 5 Added Categories</h2>
            </div>
            {recentCategories.length === 0 ? (
              <p className="px-6 py-8 text-sm text-center" style={{ color: "#e8d5a0", opacity: 0.35 }}>No categories added yet.</p>
            ) : (
              recentCategories.map((c, i) => (
                <div key={c.id} className="px-6 py-3 flex items-center justify-between gap-4" style={{ borderTop: i === 0 ? "none" : "1px solid #2e2050" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#e8d5a0" }}>{c.name_en}</p>
                    <p className="text-xs truncate" style={{ color: "#e8d5a0", opacity: 0.45 }}>{c.name_ar}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs" style={{ color: "#e8d5a0", opacity: 0.4 }}>{fmtDate(c.created_at)}</p>
                    {c.created_by && <p className="text-xs mt-0.5" style={{ color: "#d4860a", opacity: 0.7 }}>by {String(c.created_by).slice(0, 8)}…</p>}
                  </div>
                </div>
              ))
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
