"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { AuditEntry } from "@/lib/supabase/types";

const TYPE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  create: { bg: "#16a34a22", color: "#4ade80",  label: "Create" },
  update: { bg: "#d4860a22", color: "#d4860a",  label: "Update" },
  delete: { bg: "#dc262622", color: "#f87171",  label: "Delete" },
  login:  { bg: "#7c3aed22", color: "#a78bfa",  label: "Login"  },
  system: { bg: "#0ea5e922", color: "#38bdf8",  label: "System" },
};

const FALLBACK: AuditEntry[] = [
  { id: "1", user_email: "system",  action: "Database initialized", target: "Schema v1.0",                  type: "system", created_at: new Date().toISOString() },
  { id: "2", user_email: "system",  action: "Seed data loaded",     target: "12 categories, 72 questions", type: "create", created_at: new Date().toISOString() },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AuditLogPage() {
  const [logs, setLogs]       = useState<AuditEntry[]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<"all" | AuditEntry["type"]>("all");
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(0);
  const PAGE_SIZE = 20;

  const fetchLogs = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const { data } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data && data.length > 0) setLogs(data as AuditEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter((log) => {
    const matchType   = filter === "all" || log.type === filter;
    const matchSearch = !search || [log.action, log.target, log.user_email].some((f) => f?.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchSearch;
  });

  const paged   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const maxPage = Math.ceil(filtered.length / PAGE_SIZE) - 1;

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>Audit Log</h1>
            <p className="text-sm mt-1" style={{ color: "#e8d5a0", opacity: 0.5 }}>
              {loading ? "Loading…" : `${filtered.length} entries`}
              {!isSupabaseConfigured && <span style={{ color: "#f87171" }}> · demo mode</span>}
            </p>
          </div>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 rounded-full text-xs font-bold"
            style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0" }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <input
            type="text"
            placeholder="Search logs…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="flex-1 min-w-48 px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0" }}
          />
          <div className="flex gap-2 flex-wrap">
            {(["all", "create", "update", "delete", "login", "system"] as const).map((type) => {
              const style = type === "all" ? null : TYPE_STYLES[type];
              return (
                <button
                  key={type}
                  onClick={() => { setFilter(type); setPage(0); }}
                  className="px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all"
                  style={{
                    backgroundColor: filter === type ? (style?.bg ?? "#e8d5a022") : "#1e1530",
                    color:           filter === type ? (style?.color ?? "#e8d5a0") : "#e8d5a0",
                    border:          `1px solid ${filter === type ? (style?.color ?? "#e8d5a0") + "88" : "#2e2050"}`,
                    opacity:         filter === type ? 1 : 0.6,
                  }}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #2e2050" }}>
          <div
            className="grid px-5 py-3 text-xs font-bold uppercase tracking-wide"
            style={{ gridTemplateColumns: "150px 80px 1fr 1fr 80px", backgroundColor: "#0d091a", color: "#e8d5a0", opacity: 0.5 }}
          >
            <span>Timestamp</span>
            <span>User</span>
            <span>Action</span>
            <span>Target</span>
            <span className="text-center">Type</span>
          </div>

          {paged.length === 0 && !loading ? (
            <div className="px-5 py-10 text-center text-sm" style={{ color: "#e8d5a0", opacity: 0.35, backgroundColor: "#1e1530" }}>
              No log entries found.
            </div>
          ) : (
            paged.map((log, i) => {
              const style = TYPE_STYLES[log.type] ?? TYPE_STYLES.system;
              return (
                <div
                  key={log.id}
                  className="grid px-5 py-3.5 items-center gap-2"
                  style={{ gridTemplateColumns: "150px 80px 1fr 1fr 80px", borderTop: i === 0 ? "none" : "1px solid #2e2050", backgroundColor: i % 2 === 0 ? "#1e1530" : "#1a1228" }}
                >
                  <span className="text-xs font-mono" style={{ color: "#e8d5a0", opacity: 0.45 }}>{fmtDate(log.created_at)}</span>
                  <span className="text-sm font-medium truncate" style={{ color: "#e8d5a0" }}>{log.user_email?.split("@")[0] ?? "system"}</span>
                  <span className="text-sm" style={{ color: "#e8d5a0" }}>{log.action}</span>
                  <span className="text-xs" style={{ color: "#e8d5a0", opacity: 0.6 }}>{log.target}</span>
                  <div className="flex justify-center">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: style.bg, color: style.color }}>{style.label}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {maxPage > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "#e8d5a0", opacity: 0.4 }}>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-1.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0", opacity: page === 0 ? 0.3 : 1 }}
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                disabled={page === maxPage}
                className="px-4 py-1.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0", opacity: page === maxPage ? 0.3 : 1 }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
