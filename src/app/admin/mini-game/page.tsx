"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

interface LogRow { id: string; target: number; changed_by: string | null; changed_at: string }

export default function MiniGamePage() {
  const [target, setTarget]       = useState<number>(100);
  const [draft, setDraft]         = useState<string>("100");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [history, setHistory]     = useState<LogRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState("");
  const [email, setEmail]         = useState<string>("admin");

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setEmail(user.email);

      const [cfg, log] = await Promise.all([
        supabase.from("guardian_config").select("daily_target, updated_at, updated_by").eq("id", 1).maybeSingle(),
        supabase.from("guardian_target_log").select("id, target, changed_by, changed_at").order("changed_at", { ascending: false }).limit(20),
      ]);
      if (cfg.error) throw cfg.error;
      if (cfg.data) {
        setTarget(cfg.data.daily_target);
        setDraft(String(cfg.data.daily_target));
        setUpdatedAt(cfg.data.updated_at ?? null);
        setUpdatedBy(cfg.data.updated_by ?? null);
      }
      if (log.data) setHistory(log.data as LogRow[]);
      setError("");
    } catch (e) {
      setError(`Could not load mini-game settings: ${e instanceof Error ? e.message : "unknown error"}. Has the add-guardian-run.sql migration been run?`);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setError("");
    const n = parseInt(draft, 10);
    if (!Number.isFinite(n) || n < 1 || n > 100000) {
      setError("Enter a whole number between 1 and 100000.");
      return;
    }
    setSaving(true);
    if (isSupabaseConfigured) {
      const nowIso = new Date().toISOString();
      const { error: upErr } = await supabase
        .from("guardian_config")
        .update({ daily_target: n, updated_at: nowIso, updated_by: email })
        .eq("id", 1);
      if (upErr) {
        setError(`Could not save: ${upErr.message ?? "unknown error"}.`);
        setSaving(false);
        return;
      }
      // History row (best-effort — a failure here shouldn't block the save).
      await supabase.from("guardian_target_log").insert({ target: n, changed_by: email });
      await load();
    } else {
      setTarget(n);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>Mini-Game</h1>
          <p className="text-sm mt-1" style={{ color: "#e8d5a0", opacity: 0.5 }}>
            Omni Guardian Run — set the daily score players must beat to earn coins
            {!isSupabaseConfigured && <span style={{ color: "#f87171" }}> · Supabase not connected (demo mode)</span>}
          </p>
        </div>

        {error && (
          <p className="text-sm rounded-xl px-4 py-3" style={{ color: "#fca5a5", backgroundColor: "#dc262622", border: "1px solid #dc262655" }}>{error}</p>
        )}

        <div className="rounded-2xl p-7 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
          <div>
            <h2 className="font-bold text-base" style={{ color: "#e8d5a0" }}>Today&apos;s Score to Beat</h2>
            <p className="text-xs mt-1" style={{ color: "#e8d5a0", opacity: 0.45 }}>
              Players who beat this in a run earn their daily coins (2 normally, 6 for Omni 1/2/3 &amp; Master Omni) — once per day.
            </p>
          </div>

          {loading ? (
            <div className="text-sm" style={{ color: "#e8d5a0", opacity: 0.4 }}>Loading…</div>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Target score</label>
                  <input
                    type="number" min={1} max={100000} value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-40 px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-3 rounded-full text-sm font-bold hover:opacity-90"
                  style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: saving ? 0.5 : 1 }}
                >
                  {saving ? "Saving…" : "Save Target"}
                </button>
                {saved && <span className="text-sm" style={{ color: "#4ade80" }}>✓ Saved!</span>}
              </div>

              <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}>
                <span style={{ opacity: 0.6 }}>Current target:</span> <strong style={{ color: "#d4860a" }}>{target}</strong>
                <span style={{ opacity: 0.4 }}> · Last changed: </span>{fmt(updatedAt)}
                {updatedBy && <span style={{ opacity: 0.4 }}> by {updatedBy}</span>}
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl p-7 flex flex-col gap-4" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
          <h2 className="font-bold text-base" style={{ color: "#e8d5a0" }}>Change History</h2>
          {history.length === 0 ? (
            <p className="text-sm" style={{ color: "#e8d5a0", opacity: 0.4 }}>No changes recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050" }}>
                  <span style={{ color: "#e8d5a0" }}>Target → <strong style={{ color: "#d4860a" }}>{h.target}</strong></span>
                  <span style={{ color: "#e8d5a0", opacity: 0.5 }}>{fmt(h.changed_at)}{h.changed_by ? ` · ${h.changed_by}` : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
