"use client";

/**
 * omni-verse.shop/tv — the screen you open ON THE TV.
 *
 * Phase 1 (pairing): ask the server for a session, show the big
 * 4-digit code, wait for the phone to link.
 * Phase 2 (mirroring): once linked, keep polling the session's
 * `state` (which the phone pushes through /api/tv/sync) and draw a
 * big READ-ONLY copy of the game board / question / answer / results.
 * The phone stays the one and only controller.
 *
 * Polling (not websockets) on purpose so it survives strict venue /
 * office Wi-Fi. Standalone full-screen page with a "Back" button.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";

type Phase = "loading" | "waiting" | "linked" | "error";

interface BoardCell {
  category: string;
  category_ar?: string | null;
  category_image_url?: string | null;
  points: number;
  question: string;
  answer: string;
  question_ar?: string | null;
  answer_ar?: string | null;
  answered: boolean;
  image_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
}
interface Team { id: number; name: string; score: number }
interface GameState {
  step: string;
  lang: "en" | "ar";
  sessionName: string;
  gameMode: "solo" | "team";
  teams: Team[];
  soloScore: number;
  board: BoardCell[][];
  currentCell: BoardCell | null;
}

// Same difficulty tint the phone's board uses, so the TV looks identical.
function diffColor(rowIdx: number, totalRows: number, answered: boolean) {
  if (answered) return "#2e205044";
  const x = totalRows > 1 ? rowIdx / (totalRows - 1) : 0.5;
  if (x < 0.2) return "#4ade8055";
  if (x < 0.45) return "#fbbf2466";
  if (x < 0.65) return "#d4860a77";
  if (x < 0.85) return "#fb923c88";
  return "#ef444499";
}

export default function TvPage() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const [phase, setPhase] = useState<Phase>("loading");
  const [code, setCode] = useState<string>("----");
  const [errMsg, setErrMsg] = useState<string>("");
  const [game, setGame] = useState<GameState | null>(null);
  const idRef = useRef<string | null>(null);

  // Create the pairing session once when the TV opens this page.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured) {
        setErrMsg(isAr ? "هذه الصفحة تحتاج اتصالاً بالخادم." : "This screen needs a server connection.");
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
          setErrMsg(isAr ? "تعذّر بدء شاشة التلفاز." : "Could not start the TV screen.");
          setPhase("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAr]);

  // Poll our own row. While waiting: watch for the phone linking.
  // Once linked: keep polling and pull the live game `state`.
  useEffect(() => {
    if ((phase !== "waiting" && phase !== "linked") || !idRef.current) return;
    let stop = false;
    const tick = async () => {
      const { data } = await supabase
        .from("tv_sessions")
        .select("phase, state")
        .eq("id", idRef.current as string)
        .maybeSingle();
      if (stop || !data) return;
      if (data.phase === "linked") {
        setPhase("linked");
        if (data.state) setGame(data.state as GameState);
      }
    };
    tick();
    const iv = setInterval(tick, phase === "linked" ? 1200 : 2500);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [phase]);

  const shell = (children: React.ReactNode) => (
    <main
      dir={isAr ? "rtl" : "ltr"}
      className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-8 text-center"
      style={{ background: "radial-gradient(ellipse at top, #160f28 0%, #0a0713 70%)", color: "#e8d5a0" }}
    >
      {children}
    </main>
  );

  // ── Pairing screens ──────────────────────────────────────────────
  if (phase === "loading") {
    return shell(<p className="text-xl" style={{ opacity: 0.6 }}>{isAr ? "جارٍ التحضير…" : "Getting ready…"}</p>);
  }
  if (phase === "error") {
    return shell(
      <div className="max-w-xl flex flex-col gap-4">
        <p className="text-2xl font-bold" style={{ color: "#fca5a5" }}>{isAr ? "حدثت مشكلة" : "Something went wrong"}</p>
        <p className="text-base" style={{ opacity: 0.7 }}>{errMsg}</p>
        <Link href="/" className="mt-4 px-6 py-3 rounded-full text-base font-bold mx-auto" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0" }}>{isAr ? "← العودة إلى الموقع" : "← Back to the site"}</Link>
      </div>
    );
  }
  if (phase === "waiting") {
    return shell(
      <>
        <div className="flex items-center gap-3 mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Omni-Verse" className="h-12 w-auto object-contain" />
          <span className="text-2xl font-extrabold tracking-wide"><span style={{ color: "#d4860a" }}>Omni</span>-Verse</span>
        </div>
        <p className="text-2xl md:text-3xl font-semibold mb-8" style={{ opacity: 0.85 }}>
          {isAr ? "على هاتفك، ادخل لعبة واضغط «الربط بالتلفاز»، ثم اكتب هذا الرمز:" : 'On your phone, open a game and tap "Connect to TV", then type this code:'}
        </p>
        <div className="flex gap-4 md:gap-6" aria-label={isAr ? "رمز الربط" : "Pairing code"}>
          {code.split("").map((d, i) => (
            <span key={i} className="flex items-center justify-center font-extrabold rounded-2xl"
              style={{ width: "clamp(80px,14vw,170px)", height: "clamp(110px,19vw,230px)", fontSize: "clamp(56px,11vw,140px)", backgroundColor: "#1e1530", border: "2px solid #7c3aed", color: "#d4860a", boxShadow: "0 0 40px #7c3aed55" }}>
              {d}
            </span>
          ))}
        </div>
        <p className="text-lg mt-8" style={{ opacity: 0.45 }}>
          {isAr ? "هذا الرمز يعمل مرة واحدة وينتهي خلال ١٥ دقيقة." : "This code works once and expires in 15 minutes."}
        </p>
      </>
    );
  }

  // ── Linked: live mirror of the phone's game ──────────────────────
  if (!game) {
    return shell(
      <div className="flex flex-col items-center gap-5">
        <p className="text-4xl font-extrabold" style={{ color: "#4ade80" }}>{isAr ? "تم ربط الهاتف ✓" : "Phone linked ✓"}</p>
        <p className="text-xl" style={{ opacity: 0.7 }}>{isAr ? "في انتظار بدء اللعبة على الهاتف…" : "Waiting for the game to start on the phone…"}</p>
      </div>
    );
  }

  const gAr = game.lang === "ar";
  const catLabel = (c: BoardCell) => (gAr && c.category_ar ? c.category_ar : c.category);
  const qText = (c: BoardCell) => (gAr && c.question_ar ? c.question_ar : c.question);
  const aText = (c: BoardCell) => (gAr && c.answer_ar ? c.answer_ar : c.answer);

  return (
    <main
      dir={gAr ? "rtl" : "ltr"}
      className="min-h-screen w-full flex flex-col px-5 py-5 md:px-10 md:py-8"
      style={{ background: "radial-gradient(ellipse at top, #160f28 0%, #0a0713 70%)", color: "#e8d5a0" }}
    >
      {/* Header: session + scores */}
      <div className="flex items-center justify-between gap-4 mb-5 shrink-0">
        <h1 className="text-2xl md:text-4xl font-extrabold truncate" style={{ color: "#e8d5a0" }}>{game.sessionName || "Omni-Verse"}</h1>
        {game.gameMode === "team" && game.teams.length > 0 && (
          <div className="flex gap-2 md:gap-3 flex-wrap justify-end">
            {[...game.teams].sort((a, b) => b.score - a.score).map((tm) => (
              <div key={tm.id} className="flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
                <span className="text-sm md:text-lg font-medium" style={{ color: "#e8d5a0" }}>{tm.name}</span>
                <span className="text-sm md:text-lg font-extrabold" style={{ color: "#d4860a" }}>{tm.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Board */}
      {game.step === "board" && game.board.length > 0 && (
        <div className="flex-1 min-h-0 grid gap-3 md:gap-4"
          style={{ gridTemplateColumns: `repeat(${game.board.length}, minmax(0, 1fr))` }}>
          {game.board.map((col) => (
            <div key={col[0]?.category} className="flex flex-col gap-2 md:gap-3 min-h-0">
              <div className="shrink-0 rounded-xl flex flex-col overflow-hidden" style={{ backgroundColor: "#7c3aed22", border: "1px solid #7c3aed44" }}>
                {col[0]?.category_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={col[0].category_image_url} alt="" className="w-full aspect-[4/5] object-cover" style={{ backgroundColor: "#0d091a", maxHeight: "24vh" }} />
                )}
                <span className="px-2 py-2 text-center text-sm md:text-xl font-bold uppercase tracking-wide truncate" style={{ color: "#a78bfa" }}>{catLabel(col[0])}</span>
              </div>
              <div className="flex-1 min-h-0 flex flex-col gap-2 md:gap-3">
                {col.map((cell, rowIdx) => (
                  <div key={`${cell.category}-${cell.points}`}
                    className="flex-1 min-h-0 rounded-xl text-center font-extrabold text-2xl md:text-5xl flex items-center justify-center"
                    style={{ backgroundColor: cell.answered ? "#1e153088" : "#1e1530", border: `2px solid ${diffColor(rowIdx, col.length, cell.answered)}`, color: cell.answered ? "#2e205066" : "#d4860a" }}>
                    {cell.answered ? "—" : cell.points.toLocaleString()}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Question */}
      {game.step === "question" && game.currentCell && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
          <div className="flex items-center gap-3">
            <span className="px-4 py-1.5 rounded-full text-base md:text-xl font-bold uppercase" style={{ backgroundColor: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44" }}>{catLabel(game.currentCell)}</span>
            <span className="px-4 py-1.5 rounded-full text-base md:text-xl font-bold" style={{ backgroundColor: "#d4860a22", color: "#d4860a", border: "1px solid #d4860a44" }}>{game.currentCell.points.toLocaleString()}</span>
          </div>
          {game.currentCell.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.currentCell.image_url} alt="" className="max-h-[45vh] object-contain rounded-2xl" style={{ backgroundColor: "#120d1f" }} />
          )}
          {game.currentCell.video_url && (
            <video src={game.currentCell.video_url} autoPlay controls className="max-h-[45vh] rounded-2xl" style={{ backgroundColor: "#000" }} />
          )}
          {game.currentCell.audio_url && <audio src={game.currentCell.audio_url} controls autoPlay className="w-full max-w-xl" />}
          <p className="text-3xl md:text-6xl font-extrabold leading-snug max-w-5xl" style={{ color: "#e8d5a0" }}>{qText(game.currentCell)}</p>
        </div>
      )}

      {/* Answer */}
      {game.step === "answer" && game.currentCell && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
          <span className="px-4 py-1.5 rounded-full text-base md:text-xl font-bold uppercase" style={{ backgroundColor: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44" }}>{catLabel(game.currentCell)}</span>
          <p className="text-xl md:text-3xl italic max-w-4xl" style={{ color: "#e8d5a0", opacity: 0.75 }}>{qText(game.currentCell)}</p>
          <div className="rounded-2xl px-10 py-8" style={{ backgroundColor: "#1e1530", border: "1px solid #d4860a" }}>
            <p className="text-base md:text-xl mb-3 font-bold" style={{ color: "#d4860a" }}>{gAr ? "✓ الإجابة الصحيحة" : "✓ Correct Answer"}</p>
            <p className="text-4xl md:text-7xl font-extrabold" style={{ color: "#e8d5a0" }}>{aText(game.currentCell)}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {game.step === "results" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
          <div className="text-7xl">🏆</div>
          <h2 className="text-4xl md:text-6xl font-extrabold" style={{ color: "#e8d5a0" }}>{gAr ? "انتهت اللعبة!" : "Game Over!"}</h2>
          {game.gameMode === "solo" ? (
            <div className="rounded-2xl px-12 py-10" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
              <p className="text-lg mb-2" style={{ opacity: 0.6 }}>{gAr ? "نتيجتك النهائية" : "Final Score"}</p>
              <p className="text-6xl md:text-8xl font-extrabold" style={{ color: "#d4860a" }}>{game.soloScore.toLocaleString()}</p>
            </div>
          ) : (
            <div className="w-full max-w-2xl flex flex-col gap-3">
              {[...game.teams].sort((a, b) => b.score - a.score).map((tm, i) => (
                <div key={tm.id} className="flex items-center justify-between px-8 py-5 rounded-2xl"
                  style={{ backgroundColor: i === 0 ? "#d4860a22" : "#1e1530", border: `1px solid ${i === 0 ? "#d4860a" : "#2e2050"}` }}>
                  <span className="flex items-center gap-3 text-2xl md:text-3xl font-bold" style={{ color: "#e8d5a0" }}>
                    <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>{tm.name}
                  </span>
                  <span className="text-2xl md:text-3xl font-extrabold" style={{ color: i === 0 ? "#d4860a" : "#e8d5a0" }}>{tm.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer hint */}
      <p className="text-center text-sm md:text-base mt-4 shrink-0" style={{ color: "#e8d5a0", opacity: 0.35 }}>
        {gAr ? "📱 يتحكم الهاتف في اللعبة" : "📱 The phone is controlling the game"}
      </p>
    </main>
  );
}
