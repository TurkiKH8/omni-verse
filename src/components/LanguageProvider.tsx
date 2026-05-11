"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { TRANSLATIONS, type Lang, type Translations } from "@/lib/i18n";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { applyOverrides, type FlatMap } from "@/lib/translationOverrides";

const STORAGE_KEY          = "omni-verse-lang";
const OVERRIDES_CACHE_KEY  = "omni-verse-translations-overrides";
const OVERRIDES_TTL_MS     = 5 * 60 * 1000; // 5 minutes — copy refreshes on its own

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: Translations;
  dir: "ltr" | "rtl";
};

type CachedOverrides = { savedAt: number; en: FlatMap; ar: FlatMap };

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to English on first paint to avoid SSR/CSR mismatch.
  const [lang, setLangState]   = useState<Lang>("en");
  const [overrides, setOverrides] = useState<{ en: FlatMap; ar: FlatMap }>({ en: {}, ar: {} });

  // Restore saved language + try to seed override cache synchronously so
  // the first render after hydration already uses any edited copy.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved === "ar" || saved === "en") setLangState(saved);
    } catch { /* ignore */ }

    try {
      const raw = window.localStorage.getItem(OVERRIDES_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedOverrides;
        if (Date.now() - parsed.savedAt < OVERRIDES_TTL_MS) {
          setOverrides({ en: parsed.en ?? {}, ar: parsed.ar ?? {} });
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Fetch the latest overrides in the background. Cache for 5 min so we
  // don't hit Supabase on every page transition. The list is small (well
  // under a kB even with hundreds of strings).
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("translation_overrides")
          .select("key, lang, value");
        if (cancelled || !data) return;
        const next = { en: {} as FlatMap, ar: {} as FlatMap };
        for (const row of data as Array<{ key: string; lang: "en" | "ar"; value: string }>) {
          if (row.lang === "en" || row.lang === "ar") next[row.lang][row.key] = row.value;
        }
        setOverrides(next);
        try {
          window.localStorage.setItem(OVERRIDES_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), ...next }));
        } catch { /* ignore */ }
      } catch { /* ignore — fall back to defaults */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sync <html dir> + lang attribute whenever language changes
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir  = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { window.localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === "en" ? "ar" : "en");
  }, [lang, setLang]);

  // Memoise the merged tree so we don't re-clone on every render.
  const t = useMemo<Translations>(() => {
    const defaults = TRANSLATIONS[lang] as unknown as Record<string, unknown>;
    const flat     = overrides[lang] ?? {};
    return applyOverrides(defaults, flat) as unknown as Translations;
  }, [lang, overrides]);

  const value: Ctx = { lang, setLang, toggle, t, dir: lang === "ar" ? "rtl" : "ltr" };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe fallback so a component used outside the provider doesn't crash.
    return {
      lang: "en",
      setLang: () => {},
      toggle: () => {},
      t: TRANSLATIONS.en as unknown as Translations,
      dir: "ltr",
    };
  }
  return ctx;
}
