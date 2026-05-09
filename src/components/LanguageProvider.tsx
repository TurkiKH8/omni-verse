"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { TRANSLATIONS, type Lang, type Translations } from "@/lib/i18n";

const STORAGE_KEY = "omni-verse-lang";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: Translations;
  dir: "ltr" | "rtl";
};

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to English on first paint to avoid SSR/CSR mismatch.
  // Real preference is restored from localStorage in the effect below.
  const [lang, setLangState] = useState<Lang>("en");

  // Restore saved language on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved === "ar" || saved === "en") setLangState(saved);
    } catch { /* ignore */ }
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

  const value: Ctx = {
    lang,
    setLang,
    toggle,
    t:   TRANSLATIONS[lang] as unknown as Translations,
    dir: lang === "ar" ? "rtl" : "ltr",
  };

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
