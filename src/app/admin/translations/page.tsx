"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { TRANSLATIONS } from "@/lib/i18n";
import { flattenTranslations, type FlatMap } from "@/lib/translationOverrides";

type DraftMap = Record<string, { en: string; ar: string }>;

// Pretty section labels for the top-level keys in i18n.ts. Anything not
// listed here just falls back to title-casing the raw key.
const SECTION_LABELS: Record<string, string> = {
  nav:     "Navbar",
  home:    "Home page",
  about:   "About page",
  buy:     "Buy / Pricing",
  login:   "Login page",
  signup:  "Sign-up page",
  welcome: "Welcome page",
  arena:   "Arena (game flow)",
  history: "Game history",
  forgot:  "Forgot password",
  afk:     "Away-from-keyboard prompt",
  profile: "Profile editor",
};

function sectionLabel(key: string): string {
  return SECTION_LABELS[key] ?? key.replace(/^\w/, (c) => c.toUpperCase());
}

export default function TranslationsAdminPage() {
  const [rank,    setRank]    = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // Defaults: flat map of every key in i18n.ts.
  const defaultsEn = useMemo(() => flattenTranslations(TRANSLATIONS.en as Record<string, unknown>), []);
  const defaultsAr = useMemo(() => flattenTranslations(TRANSLATIONS.ar as Record<string, unknown>), []);

  // The active draft starts equal to defaults; overrides loaded from DB
  // replace the corresponding entries.
  const [draft,    setDraft]    = useState<DraftMap>({});
  const [serverOverrides, setServerOverrides] = useState<{ en: FlatMap; ar: FlatMap }>({ en: {}, ar: {} });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [savedAt,  setSavedAt]  = useState<number | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [filter,   setFilter]   = useState("");

  // Build the canonical key list, grouped by top-level section.
  const keysBySection = useMemo(() => {
    const all = Object.keys(defaultsEn).sort();
    const groups: Record<string, string[]> = {};
    for (const k of all) {
      const section = k.split(".")[0] ?? "_misc";
      (groups[section] ??= []).push(k);
    }
    return groups;
  }, [defaultsEn]);

  // Auth + rank
  useEffect(() => {
    if (!isSupabaseConfigured) { setAuthReady(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) { if (!cancelled) setAuthReady(true); return; }
        const { data } = await supabase
          .from("profiles")
          .select("is_admin, rank")
          .eq("id", uid)
          .maybeSingle();
        if (cancelled) return;
        setIsAdmin(data?.is_admin ?? false);
        setRank(data?.rank ?? null);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load existing overrides, seed the draft.
  useEffect(() => {
    if (!authReady) return;
    if (!isSupabaseConfigured) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from("translation_overrides").select("key, lang, value");
        if (cancelled) return;
        const enMap: FlatMap = {};
        const arMap: FlatMap = {};
        for (const row of (data ?? []) as Array<{ key: string; lang: "en" | "ar"; value: string }>) {
          if (row.lang === "en") enMap[row.key] = row.value;
          if (row.lang === "ar") arMap[row.key] = row.value;
        }
        setServerOverrides({ en: enMap, ar: arMap });

        // Seed the editable draft: override if present, else default.
        const allKeys = new Set([...Object.keys(defaultsEn), ...Object.keys(defaultsAr)]);
        const next: DraftMap = {};
        for (const key of allKeys) {
          next[key] = {
            en: enMap[key] ?? defaultsEn[key] ?? "",
            ar: arMap[key] ?? defaultsAr[key] ?? "",
          };
        }
        setDraft(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authReady, defaultsEn, defaultsAr]);

  // ── Permission gate ─────────────────────────────────────────────────────
  if (!authReady) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
             style={{ borderColor: "#d4860a", borderTopColor: "transparent" }} />
      </div>
    );
  }
  if (rank !== "Master Omni") {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center flex flex-col gap-4">
        <span className="text-5xl">🔒</span>
        <h1 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>Master Omni Only</h1>
        <p className="text-sm" style={{ color: "#e8d5a0", opacity: 0.6 }}>
          Editing site copy is restricted to the Master Omni rank. Ask a Master Omni teammate to make changes here.
        </p>
        <div>
          <Link href="/admin/dashboard"
            className="inline-block px-6 py-2.5 rounded-full text-sm font-bold"
            style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Diff computation ────────────────────────────────────────────────────
  const computeDiff = (): { upserts: Array<{ key: string; lang: "en" | "ar"; value: string }>; deletes: Array<{ key: string; lang: "en" | "ar" }> } => {
    const upserts: Array<{ key: string; lang: "en" | "ar"; value: string }> = [];
    const deletes: Array<{ key: string; lang: "en" | "ar" }> = [];
    for (const [key, pair] of Object.entries(draft)) {
      // EN
      const enDefault = defaultsEn[key] ?? "";
      const enServer  = serverOverrides.en[key];
      if (pair.en !== enDefault) {
        if (pair.en !== enServer) upserts.push({ key, lang: "en", value: pair.en });
      } else if (enServer !== undefined) {
        deletes.push({ key, lang: "en" });
      }
      // AR
      const arDefault = defaultsAr[key] ?? "";
      const arServer  = serverOverrides.ar[key];
      if (pair.ar !== arDefault) {
        if (pair.ar !== arServer) upserts.push({ key, lang: "ar", value: pair.ar });
      } else if (arServer !== undefined) {
        deletes.push({ key, lang: "ar" });
      }
    }
    return { upserts, deletes };
  };

  const diff = useMemo(computeDiff, [draft, defaultsEn, defaultsAr, serverOverrides]);
  const pendingCount = diff.upserts.length + diff.deletes.length;

  // ── Save / Reset / Reset-row helpers ───────────────────────────────────
  const save = async () => {
    if (!isSupabaseConfigured || pendingCount === 0) return;
    setSaving(true); setError(null);
    try {
      if (diff.upserts.length > 0) {
        const { error: upErr } = await supabase
          .from("translation_overrides")
          .upsert(diff.upserts.map((r) => ({ ...r, updated_at: new Date().toISOString() })), { onConflict: "key,lang" });
        if (upErr) throw upErr;
      }
      for (const d of diff.deletes) {
        await supabase.from("translation_overrides").delete().eq("key", d.key).eq("lang", d.lang);
      }
      // Refresh server snapshot so subsequent diffs are accurate.
      const next = { en: { ...serverOverrides.en }, ar: { ...serverOverrides.ar } };
      for (const u of diff.upserts) next[u.lang][u.key] = u.value;
      for (const d of diff.deletes) delete next[d.lang][d.key];
      setServerOverrides(next);
      setSavedAt(Date.now());
      // Force a fresh fetch on the public site by busting the cache key.
      try { window.localStorage.removeItem("omni-verse-translations-overrides"); } catch { /* ignore */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const resetRow = (key: string) => {
    setDraft((prev) => ({ ...prev, [key]: { en: defaultsEn[key] ?? "", ar: defaultsAr[key] ?? "" } }));
  };

  const discardAll = () => {
    const next: DraftMap = {};
    const allKeys = new Set([...Object.keys(defaultsEn), ...Object.keys(defaultsAr)]);
    for (const key of allKeys) {
      next[key] = {
        en: serverOverrides.en[key] ?? defaultsEn[key] ?? "",
        ar: serverOverrides.ar[key] ?? defaultsAr[key] ?? "",
      };
    }
    setDraft(next);
  };

  // ── Render ──────────────────────────────────────────────────────────────
  const sections = Object.keys(keysBySection).sort((a, b) => {
    const order = Object.keys(SECTION_LABELS);
    const ai = order.indexOf(a), bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const filterLower = filter.trim().toLowerCase();
  const matches = (key: string) => {
    if (!filterLower) return true;
    if (key.toLowerCase().includes(filterLower)) return true;
    const pair = draft[key];
    if (!pair) return false;
    return pair.en.toLowerCase().includes(filterLower) || pair.ar.toLowerCase().includes(filterLower);
  };

  return (
    <div className="px-6 py-6 md:px-10 md:py-8 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: "#e8d5a0" }}>
          ✍️ Site Copy
        </h1>
        <p className="text-sm" style={{ color: "#e8d5a0", opacity: 0.6 }}>
          Every visible text string on the site, editable in English and Arabic. Leave a field empty to keep the default. Restricted to <strong style={{ color: "#d4860a" }}>Master Omni</strong>.
        </p>
      </header>

      {/* Sticky action bar */}
      <div className="sticky top-0 z-30 -mx-2 px-2 py-3 flex flex-col md:flex-row md:items-center gap-3 rounded-xl backdrop-blur"
           style={{ backgroundColor: "#120d1fcc", borderBottom: "1px solid #2e2050" }}>
        <input
          type="text" placeholder="Filter by key, English, or Arabic text…"
          value={filter} onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
          style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0" }}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "#e8d5a0", opacity: 0.6 }}>
            {pendingCount > 0 ? `${pendingCount} pending change${pendingCount === 1 ? "" : "s"}` : "No unsaved changes"}
          </span>
          <button onClick={discardAll} disabled={pendingCount === 0 || saving}
            className="px-4 py-2 rounded-full text-xs font-medium transition-opacity"
            style={{ border: "1px solid #2e2050", color: "#e8d5a0", opacity: pendingCount === 0 ? 0.4 : 1, cursor: pendingCount === 0 ? "not-allowed" : "pointer" }}>
            Discard
          </button>
          <button onClick={save} disabled={pendingCount === 0 || saving}
            className="px-5 py-2 rounded-full text-xs font-bold transition-opacity"
            style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: pendingCount === 0 || saving ? 0.5 : 1, cursor: pendingCount === 0 || saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {savedAt && (
        <p className="text-xs px-3 py-2 rounded-xl"
           style={{ backgroundColor: "#10b98122", color: "#4ade80", border: "1px solid #10b98144" }}>
          ✓ Saved. Visitors will see the new copy on their next page load.
        </p>
      )}
      {error && (
        <p className="text-xs px-3 py-2 rounded-xl"
           style={{ backgroundColor: "#dc262622", color: "#f87171", border: "1px solid #dc262644" }}>
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 animate-spin"
               style={{ borderColor: "#d4860a", borderTopColor: "transparent" }} />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {sections.map((section) => {
            const keys = keysBySection[section].filter(matches);
            if (keys.length === 0) return null;
            return (
              <section key={section} className="rounded-2xl overflow-hidden"
                       style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
                <header className="px-5 py-3 flex items-center justify-between"
                        style={{ backgroundColor: "#0d091a", borderBottom: "1px solid #2e2050" }}>
                  <h2 className="text-base font-bold" style={{ color: "#d4860a" }}>
                    {sectionLabel(section)}
                  </h2>
                  <span className="text-xs" style={{ color: "#e8d5a0", opacity: 0.5 }}>
                    {keys.length} string{keys.length === 1 ? "" : "s"}
                  </span>
                </header>
                <div className="divide-y" style={{ borderColor: "#2e2050" }}>
                  {keys.map((key) => {
                    const pair       = draft[key] ?? { en: "", ar: "" };
                    const enDefault  = defaultsEn[key] ?? "";
                    const arDefault  = defaultsAr[key] ?? "";
                    const hasEnOverride = serverOverrides.en[key] !== undefined;
                    const hasArOverride = serverOverrides.ar[key] !== undefined;
                    const enChanged  = pair.en !== (hasEnOverride ? serverOverrides.en[key] : enDefault);
                    const arChanged  = pair.ar !== (hasArOverride ? serverOverrides.ar[key] : arDefault);
                    const customised = hasEnOverride || hasArOverride || enChanged || arChanged;
                    return (
                      <div key={key} className="px-4 py-3 md:px-5 md:py-4 grid grid-cols-1 md:grid-cols-[200px_1fr_1fr_auto] gap-2 md:gap-3 items-start"
                           style={{ backgroundColor: customised ? "#d4860a0a" : "transparent" }}>
                        <div className="flex flex-col gap-1 min-w-0">
                          <code className="text-xs font-mono break-all" style={{ color: "#a78bfa" }}>{key}</code>
                          {customised && (
                            <span className="text-[10px] font-bold uppercase" style={{ color: "#d4860a" }}>
                              {(hasEnOverride || hasArOverride) ? "edited" : "unsaved"}
                            </span>
                          )}
                        </div>
                        <textarea
                          value={pair.en} rows={Math.min(4, Math.max(1, Math.ceil(pair.en.length / 60)))}
                          onChange={(e) => setDraft((p) => ({ ...p, [key]: { ...p[key], en: e.target.value } }))}
                          placeholder={enDefault}
                          dir="ltr"
                          className="px-3 py-2 rounded-lg text-sm outline-none w-full resize-y"
                          style={{ backgroundColor: "#120d1f", border: `1px solid ${enChanged ? "#d4860a66" : "#2e2050"}`, color: "#e8d5a0", fontFamily: "inherit" }}
                        />
                        <textarea
                          value={pair.ar} rows={Math.min(4, Math.max(1, Math.ceil(pair.ar.length / 60)))}
                          onChange={(e) => setDraft((p) => ({ ...p, [key]: { ...p[key], ar: e.target.value } }))}
                          placeholder={arDefault}
                          dir="rtl"
                          className="px-3 py-2 rounded-lg text-sm outline-none w-full resize-y"
                          style={{ backgroundColor: "#120d1f", border: `1px solid ${arChanged ? "#d4860a66" : "#2e2050"}`, color: "#e8d5a0", fontFamily: "inherit" }}
                        />
                        <button onClick={() => resetRow(key)}
                          title="Reset both languages to the built-in default"
                          className="px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap self-start"
                          style={{ border: "1px solid #2e2050", color: "#e8d5a0", opacity: 0.7, cursor: "pointer" }}>
                          Reset
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {!loading && Object.values(keysBySection).every((k) => k.filter(matches).length === 0) && (
            <p className="px-4 py-8 text-center text-sm" style={{ color: "#e8d5a0", opacity: 0.5 }}>
              No keys match &ldquo;{filter}&rdquo;.
            </p>
          )}
        </div>
      )}

      {/* Unused warning — prevents accidental "is_admin" by-passing the masterOnly check. */}
      {isAdmin && rank !== "Master Omni" && null}
    </div>
  );
}
