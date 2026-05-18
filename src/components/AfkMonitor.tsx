"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

// Pages where AFK monitor is DISABLED (game pages, and the TV mirror —
// a TV is left untouched on purpose, so an "are you there?" prompt
// would just sit there annoyingly).
const AFK_EXCLUDED_PREFIXES = ["/arena", "/admin", "/tv"];

const INITIAL_TIMEOUT_MS  = 15 * 60 * 1000; // 15 minutes
const TIMEOUT_INCREMENT_MS = 10 * 60 * 1000; // +10 minutes each time user stays

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;

export default function AfkMonitor() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [showPrompt, setShowPrompt]   = useState(false);
  const timeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thresholdRef   = useRef(INITIAL_TIMEOUT_MS);
  const showPromptRef  = useRef(false);

  // Keep ref in sync with state so event handlers see the latest value
  useEffect(() => { showPromptRef.current = showPrompt; }, [showPrompt]);

  const isExcluded = AFK_EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p));

  const scheduleTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShowPrompt(true);
    }, thresholdRef.current);
  }, []);

  const handleActivity = useCallback(() => {
    // While the prompt is showing, ignore activity — user must click the button
    if (showPromptRef.current) return;
    scheduleTimeout();
  }, [scheduleTimeout]);

  useEffect(() => {
    if (isExcluded) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setShowPrompt(false);
      return;
    }

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    scheduleTimeout();

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handleActivity));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isExcluded, handleActivity, scheduleTimeout]);

  const handleStillHere = () => {
    setShowPrompt(false);
    thresholdRef.current += TIMEOUT_INCREMENT_MS;
    scheduleTimeout();
  };

  if (!showPrompt || isExcluded) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ backgroundColor: "#00000099" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 flex flex-col items-center gap-5 text-center"
        style={{ backgroundColor: "#1e1530", border: "2px solid #d4860a" }}
      >
        <span className="text-5xl">👋</span>

        <div>
          <h2 className="text-xl font-extrabold" style={{ color: "#e8d5a0" }}>
            {t.afk.title}
          </h2>
          <p className="text-sm mt-2" style={{ color: "#e8d5a0", opacity: 0.6 }}>
            {t.afk.hint}
          </p>
        </div>

        <button
          onClick={handleStillHere}
          className="w-full py-3 rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#d4860a", color: "#120d1f" }}
        >
          {t.afk.stillHere}
        </button>
      </div>
    </div>
  );
}
