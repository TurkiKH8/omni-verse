"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

const PERMISSIONS = [
  { key: "can_add_question",        label: "Add Question" },
  { key: "can_remove_question",     label: "Remove Question" },
  { key: "can_add_category",        label: "Add Category" },
  { key: "can_remove_category",     label: "Remove Category" },
  { key: "can_bulk_add_questions",  label: "Bulk Add Questions" },
  { key: "can_bulk_remove_questions", label: "Bulk Remove Questions" },
  { key: "can_hide_questions",      label: "Hide / Unhide Questions" },
  { key: "can_hide_categories",     label: "Hide / Unhide Categories" },
] as const;

type PermKey = (typeof PERMISSIONS)[number]["key"];

type RankPerm = Record<PermKey, boolean> & { rank: string };

const RANK_ORDER = ["Omni 1", "Omni 2", "Omni 3", "Master Omni"];

function rankAccentColor(rank: string): string {
  if (rank === "Master Omni") return "#d4860a";
  if (rank === "Omni 3")      return "#7c3aed";
  if (rank === "Omni 2")      return "#0ea5e9";
  return "#e8d5a044";
}

export default function RanksPage() {
  const [perms, setPerms] = useState<RankPerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from("rank_permissions")
      .select("*")
      .then(({ data }) => {
        if (data) {
          // Sort by RANK_ORDER
          const sorted = RANK_ORDER.map(
            (r) => (data as RankPerm[]).find((p) => p.rank === r)
          ).filter(Boolean) as RankPerm[];
          setPerms(sorted);
        }
        setLoading(false);
      });
  }, []);

  const toggle = (rank: string, key: PermKey) => {
    setPerms((prev) =>
      prev.map((p) => (p.rank === rank ? { ...p, [key]: !p[key] } : p))
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    for (const perm of perms) {
      const update: Partial<RankPerm> & { updated_at: string } = {
        can_add_question:          perm.can_add_question,
        can_remove_question:       perm.can_remove_question,
        can_add_category:          perm.can_add_category,
        can_remove_category:       perm.can_remove_category,
        can_bulk_add_questions:    perm.can_bulk_add_questions,
        can_bulk_remove_questions: perm.can_bulk_remove_questions,
        can_hide_questions:        perm.can_hide_questions,
        can_hide_categories:       perm.can_hide_categories,
        updated_at:                new Date().toISOString(),
      };
      await supabase.from("rank_permissions").update(update).eq("rank", perm.rank);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>Ranks</h1>
            <p className="text-sm mt-1" style={{ color: "#e8d5a0", opacity: 0.5 }}>
              Control what each rank can do in the admin portal
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-colors"
            style={{
              backgroundColor: saved ? "#16a34a" : "#d4860a",
              color: "#120d1f",
              opacity: saving || loading ? 0.5 : 1,
            }}
          >
            {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Changes"}
          </button>
        </div>

        {loading ? (
          <div className="text-sm" style={{ color: "#e8d5a0", opacity: 0.4 }}>Loading…</div>
        ) : (
          <div className="flex flex-col gap-5">
            {perms.map((rankPerm) => {
              const accent = rankAccentColor(rankPerm.rank);
              return (
                <div
                  key={rankPerm.rank}
                  className="rounded-2xl p-6 flex flex-col gap-5"
                  style={{ backgroundColor: "#1e1530", border: `1px solid #2e2050` }}
                >
                  {/* Rank title row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xl font-extrabold" style={{ color: accent }}>
                      {rankPerm.rank}
                    </span>
                    {rankPerm.rank === "Omni 1" && (
                      <span
                        className="text-xs px-2.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "#e8d5a011",
                          color: "#e8d5a055",
                          border: "1px solid #e8d5a022",
                        }}
                      >
                        Default — not visible to customers
                      </span>
                    )}
                    {rankPerm.rank === "Master Omni" && (
                      <span
                        className="text-xs px-2.5 py-0.5 rounded-full font-bold"
                        style={{
                          backgroundColor: "#d4860a22",
                          color: "#d4860a",
                          border: "1px solid #d4860a44",
                        }}
                      >
                        Full Access
                      </span>
                    )}
                  </div>

                  {/* Permission toggles */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PERMISSIONS.map(({ key, label }) => {
                      const on = rankPerm[key];
                      return (
                        <button
                          key={key}
                          onClick={() => toggle(rankPerm.rank, key)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all"
                          style={{
                            backgroundColor: on ? "#16a34a22" : "#0d091a",
                            border: `1px solid ${on ? "#4ade8044" : "#2e2050"}`,
                            color: on ? "#4ade80" : "#e8d5a055",
                          }}
                        >
                          <span className="text-sm shrink-0">{on ? "✓" : "○"}</span>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info note */}
        <div
          className="rounded-xl px-5 py-4"
          style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}
        >
          <p className="text-xs leading-relaxed" style={{ color: "#e8d5a0", opacity: 0.5 }}>
            <span style={{ color: "#d4860a", opacity: 1, fontWeight: 700 }}>Note: </span>
            Full Admins (the is_admin flag) always have every permission regardless of rank settings.
            Omni 1 is the default rank assigned to all new customers and is never displayed in the front-end.
            Ranks from Omni 2 upward are visible in the admin portal only.
          </p>
        </div>
      </div>
    </div>
  );
}
