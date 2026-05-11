"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";

type Status = "active" | "completed" | "expired";

interface SessionRow {
  id: string;
  name: string;
  game_mode: "solo" | "team";
  category_names: string[];
  total_questions: number;
  status: Status;
  solo_score: number | null;
  teams_state: Array<{ id: number; name: string; score: number }> | null;
  board_state: Array<Array<{ answered?: boolean }>> | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string;
  last_active_at: string;
}

function answeredCount(board: SessionRow["board_state"]): number {
  if (!board) return 0;
  return board.flat().filter((c) => c?.answered).length;
}

function totalCells(board: SessionRow["board_state"], fallback: number): number {
  if (!board) return fallback;
  return board.flat().length || fallback;
}

function formatHMS(ms: number, t: { hours: string; minutes: string; seconds: string }) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}${t.hours} ${String(m).padStart(2, "0")}${t.minutes} ${String(s).padStart(2, "0")}${t.seconds}`;
}

function formatDate(iso: string, lang: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export default function HistoryView() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [now, setNow] = useState<number>(() => Date.now());
  // Confirmation modal state — null when closed, the session being cancelled otherwise.
  const [cancelTarget, setCancelTarget] = useState<SessionRow | null>(null);
  const [cancelling,   setCancelling]   = useState(false);

  // Tick once per second so the 24h countdown updates live.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch the logged-in user's sessions and lazily mark any expired ones.
  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setAuthed(false); setLoading(false); return; }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) { setAuthed(false); setLoading(false); return; }
      setAuthed(true);

      const { data, error } = await supabase
        .from("sessions")
        .select("id, name, game_mode, category_names, total_questions, status, solo_score, teams_state, board_state, created_at, completed_at, expires_at, last_active_at")
        .eq("user_id", uid)
        .order("last_active_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        const rows = data as SessionRow[];
        // Auto-flip expired active rows (24h passed) so they appear in the
        // Past section instead of Active.
        const nowDate = new Date();
        const toExpire = rows
          .filter((r) => r.status === "active" && new Date(r.expires_at) < nowDate)
          .map((r) => r.id);
        if (toExpire.length > 0) {
          await supabase.from("sessions").update({ status: "expired" }).in("id", toExpire);
          rows.forEach((r) => { if (toExpire.includes(r.id)) r.status = "expired"; });
        }
        setSessions(rows);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleResume = (id: string) => {
    router.push(`/arena?resume=${id}`);
  };

  // Cancelling an active game deletes the row outright — coins already spent
  // are NOT refunded (per product spec). The user is warned by a modal first.
  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await supabase.from("sessions").delete().eq("id", cancelTarget.id);
      setSessions((prev) => prev.filter((s) => s.id !== cancelTarget.id));
      setCancelTarget(null);
    } finally {
      setCancelling(false);
    }
  };

  const active   = sessions.filter((s) => s.status === "active");
  const past     = sessions.filter((s) => s.status !== "active");

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-4 py-16">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "#d4860a", borderTopColor: "transparent" }} />
        <p className="text-sm" style={{ color: "#e8d5a0", opacity: 0.6 }}>{t.history.loading}</p>
      </div>
    );
  }

  if (authed === false) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center gap-5 py-16 text-center">
        <p style={{ color: "#e8d5a0" }}>{t.history.loginRequired}</p>
        <Link href="/login?next=/history"
          className="px-8 py-3 rounded-full font-bold text-sm"
          style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>
          {t.history.goLogin}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold" style={{ color: "#e8d5a0" }}>{t.history.title}</h1>
        <p className="text-sm mt-2" style={{ color: "#e8d5a0", opacity: 0.6 }}>{t.history.subtitle}</p>
      </header>

      {/* ─── Active games ────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "#d4860a" }}>{t.history.active}</h2>
          <p className="text-xs mt-0.5" style={{ color: "#e8d5a0", opacity: 0.5 }}>{t.history.activeHint}</p>
        </div>
        {active.length === 0 ? (
          <p className="px-4 py-6 rounded-2xl text-sm text-center"
             style={{ backgroundColor: "#1e1530", border: "1px dashed #2e2050", color: "#e8d5a0", opacity: 0.6 }}>
            {t.history.noActive}
          </p>
        ) : (
          <div className="grid gap-3">
            {active.map((s) => {
              const remaining = new Date(s.expires_at).getTime() - now;
              const answered  = answeredCount(s.board_state);
              const total     = totalCells(s.board_state, s.total_questions);
              return (
                <div key={s.id} className="rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-5"
                     style={{ backgroundColor: "#1e1530", border: "1px solid #d4860a44" }}>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base md:text-lg truncate" style={{ color: "#e8d5a0" }}>{s.name}</h3>
                    <p className="text-xs mt-1" style={{ color: "#e8d5a0", opacity: 0.55 }}>
                      {t.history.mode}: <span style={{ color: "#d4860a" }}>{s.game_mode === "solo" ? t.history.solo : t.history.team}</span>
                      {" · "}
                      {t.history.categories}: <span style={{ color: "#d4860a" }}>{s.category_names.length}</span>
                      {" · "}
                      {t.history.progress}: <span style={{ color: "#d4860a" }}>{answered}/{total}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-xs text-right md:text-left">
                      <p style={{ color: "#e8d5a0", opacity: 0.5 }}>{t.history.expiresIn}</p>
                      <p className="font-mono font-bold tabular-nums" style={{ color: remaining < 3600 * 1000 ? "#ef4444" : "#d4860a" }}>
                        {formatHMS(remaining, t.history)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleResume(s.id)}
                        className="px-5 py-2.5 rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>
                        {t.history.resume}
                      </button>
                      <button onClick={() => setCancelTarget(s)}
                        className="px-4 py-2.5 rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: "transparent", color: "#f87171", border: "1px solid #dc262666" }}>
                        {t.history.cancel}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Past / completed / expired games ─────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold" style={{ color: "#d4860a" }}>{t.history.completed}</h2>
        {past.length === 0 ? (
          <p className="px-4 py-6 rounded-2xl text-sm text-center"
             style={{ backgroundColor: "#1e1530", border: "1px dashed #2e2050", color: "#e8d5a0", opacity: 0.6 }}>
            {t.history.noCompleted}
          </p>
        ) : (
          <div className="grid gap-3">
            {past.map((s) => {
              const sorted = [...(s.teams_state ?? [])].sort((a, b) => b.score - a.score);
              const winner = sorted[0];
              const isExpired = s.status === "expired";
              return (
                <div key={s.id} className="rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3"
                     style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", opacity: isExpired ? 0.55 : 1 }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base md:text-lg truncate" style={{ color: "#e8d5a0" }}>{s.name}</h3>
                      {isExpired && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                              style={{ backgroundColor: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44" }}>
                          {t.history.expired}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1" style={{ color: "#e8d5a0", opacity: 0.55 }}>
                      {t.history.played}: <span style={{ color: "#e8d5a0", opacity: 0.8 }}>{formatDate(s.completed_at ?? s.last_active_at, lang)}</span>
                      {" · "}
                      {t.history.mode}: <span style={{ color: "#d4860a" }}>{s.game_mode === "solo" ? t.history.solo : t.history.team}</span>
                      {" · "}
                      {t.history.categories}: <span style={{ color: "#d4860a" }}>{s.category_names.length}</span>
                    </p>
                  </div>
                  <div className="text-xs shrink-0 text-right">
                    {s.game_mode === "solo" ? (
                      <>
                        <p style={{ color: "#e8d5a0", opacity: 0.5 }}>{t.history.finalScore}</p>
                        <p className="font-extrabold text-lg" style={{ color: "#d4860a" }}>{(s.solo_score ?? 0).toLocaleString()}</p>
                      </>
                    ) : winner ? (
                      <>
                        <p style={{ color: "#e8d5a0", opacity: 0.5 }}>🏆 {t.history.winner}</p>
                        <p className="font-extrabold" style={{ color: "#d4860a" }}>{winner.name}</p>
                        <p className="font-mono" style={{ color: "#e8d5a0", opacity: 0.7 }}>{winner.score.toLocaleString()}</p>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Cancel confirmation modal ─────────────────────────────────── */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
             style={{ backgroundColor: "#00000099" }}>
          <div className="w-full max-w-md rounded-2xl p-6 md:p-7 flex flex-col gap-5"
               style={{ backgroundColor: "#1e1530", border: "1px solid #dc262666" }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <h3 className="font-bold text-lg" style={{ color: "#f87171" }}>{t.history.cancelTitle}</h3>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#e8d5a0" }}>
              {t.history.cancelBodyA}{" "}
              <strong style={{ color: "#d4860a" }}>&ldquo;{cancelTarget.name}&rdquo;</strong>
              {t.history.cancelBodyB}{" "}
              <strong style={{ color: "#d4860a" }}>{cancelTarget.category_names.length}</strong>{" "}
              {t.history.cancelBodyC}{cancelTarget.category_names.length === 1 ? "" : "s"}{" "}
              {t.history.cancelBodyD}
              <br />
              <span className="text-xs" style={{ color: "#e8d5a0", opacity: 0.55 }}>{t.history.cancelBodyE}</span>
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
              <button onClick={() => setCancelTarget(null)} disabled={cancelling}
                className="px-5 py-2.5 rounded-full text-sm font-medium"
                style={{ border: "1px solid #2e2050", color: "#e8d5a0", cursor: cancelling ? "not-allowed" : "pointer" }}>
                {t.history.cancelNo}
              </button>
              <button onClick={confirmCancel} disabled={cancelling}
                className="px-5 py-2.5 rounded-full text-sm font-bold transition-opacity"
                style={{ backgroundColor: "#dc2626", color: "#ffffff", opacity: cancelling ? 0.6 : 1, cursor: cancelling ? "not-allowed" : "pointer" }}>
                {cancelling ? t.history.cancelling : t.history.cancelYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
