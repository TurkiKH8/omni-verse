"use client";

/**
 * omni-verse.shop/tv — the screen you open ON THE TV.
 *
 * It asks the server for a brand-new pairing session, shows the big
 * 4-digit code across the room, and waits. When the customer types
 * that code on their phone (inside a game), this page flips to the
 * "connected" state. Full game-board mirroring onto the TV is the
 * next phase; this phase delivers the secure phone↔TV pairing.
 *
 * Standalone full-screen page with a "Back to the site" button —
 * same shape as the Guardian Run page.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";

type Phase = "loading" | "waiting" | "linked" | "error";

export default function TvPage() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const [phase, setPhase] = useState<Phase>("loading");
  const [code, setCode] = useState<string>("----");
  const [errMsg, setErrMsg] = useState<string>("");
  const idRef = useRef<string | null>(null);

  // Create the pairing session once when the TV opens this page.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured) {
        setErrMsg(
          isAr
            ? "هذه الصفحة تحتاج اتصالاً بالخادم."
            : "This screen needs a server connection."
        );
        setPhase("error");
        return;
      }
      try {
        const res = await fetch("/api/tv/create", { method: "POST" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data?.code) {
          setErrMsg(data?.error || "Could not start the TV screen.");
          setPhase("error");
          return;
        }
        idRef.current = data.id;
        setCode(data.code);
        setPhase("waiting");
      } catch {
        if (!cancelled) {
          setErrMsg(
            isAr ? "تعذّر بدء شاشة التلفاز." : "Could not start the TV screen."
          );
          setPhase("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAr]);

  // While waiting, poll our own row every 2.5s for the phone linking.
  // Polling (not realtime) keeps this working on strict venue / office
  // Wi-Fi that often blocks websockets.
  useEffect(() => {
    if (phase !== "waiting" || !idRef.current) return;
    let stop = false;
    const tick = async () => {
      const { data } = await supabase
        .from("tv_sessions")
        .select("phase")
        .eq("id", idRef.current as string)
        .maybeSingle();
      if (stop) return;
      if (data?.phase === "linked") setPhase("linked");
    };
    const iv = setInterval(tick, 2500);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [phase]);

  return (
    <main
      dir={isAr ? "rtl" : "ltr"}
      className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-10 text-center"
      style={{
        background: "radial-gradient(ellipse at top, #160f28 0%, #0a0713 70%)",
        color: "#e8d5a0",
      }}
    >
      <div className="flex items-center gap-3 mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Omni-Verse" className="h-12 w-auto object-contain" />
        <span className="text-2xl font-extrabold tracking-wide">
          <span style={{ color: "#d4860a" }}>Omni</span>-Verse
        </span>
      </div>

      {phase === "loading" && (
        <p className="text-xl" style={{ opacity: 0.6 }}>
          {isAr ? "جارٍ التحضير…" : "Getting ready…"}
        </p>
      )}

      {phase === "error" && (
        <div className="max-w-xl flex flex-col gap-4">
          <p className="text-2xl font-bold" style={{ color: "#fca5a5" }}>
            {isAr ? "حدثت مشكلة" : "Something went wrong"}
          </p>
          <p className="text-base" style={{ opacity: 0.7 }}>{errMsg}</p>
        </div>
      )}

      {phase === "waiting" && (
        <div className="flex flex-col items-center gap-8">
          <p className="text-2xl md:text-3xl font-semibold" style={{ opacity: 0.85 }}>
            {isAr
              ? "على هاتفك، ادخل لعبة واضغط «الربط بالتلفاز»، ثم اكتب هذا الرمز:"
              : 'On your phone, open a game and tap "Connect to TV", then type this code:'}
          </p>
          <div
            className="flex gap-4 md:gap-6"
            aria-label={isAr ? "رمز الربط" : "Pairing code"}
          >
            {code.split("").map((d, i) => (
              <span
                key={i}
                className="flex items-center justify-center font-extrabold rounded-2xl"
                style={{
                  width: "clamp(80px, 14vw, 170px)",
                  height: "clamp(110px, 19vw, 230px)",
                  fontSize: "clamp(56px, 11vw, 140px)",
                  backgroundColor: "#1e1530",
                  border: "2px solid #7c3aed",
                  color: "#d4860a",
                  boxShadow: "0 0 40px #7c3aed55",
                }}
              >
                {d}
              </span>
            ))}
          </div>
          <p className="text-lg" style={{ opacity: 0.45 }}>
            {isAr
              ? "هذا الرمز يعمل مرة واحدة وينتهي خلال ١٥ دقيقة."
              : "This code works once and expires in 15 minutes."}
          </p>
        </div>
      )}

      {phase === "linked" && (
        <div className="flex flex-col items-center gap-5">
          <p className="text-4xl md:text-5xl font-extrabold" style={{ color: "#4ade80" }}>
            {isAr ? "تم ربط الهاتف ✓" : "Phone linked ✓"}
          </p>
          <p className="text-xl md:text-2xl" style={{ opacity: 0.75 }}>
            {isAr
              ? "هاتفك الآن هو جهاز التحكم. استمتعوا باللعب!"
              : "Your phone is now the remote. Enjoy the game!"}
          </p>
        </div>
      )}

      <Link
        href="/"
        className="mt-12 px-6 py-3 rounded-full text-base font-bold"
        style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0" }}
      >
        {isAr ? "← العودة إلى الموقع" : "← Back to the site"}
      </Link>
    </main>
  );
}
