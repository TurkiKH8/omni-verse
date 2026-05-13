"use client";

import { useState, useEffect, useCallback } from "react";

// Same set of ranks recognised by AdminSidebar / proxy.ts
const STAFF_RANKS = ["Omni 1", "Omni 2", "Omni 3", "Master Omni"] as const;
type StaffRank = (typeof STAFF_RANKS)[number];

const RANK_COLORS: Record<StaffRank, string> = {
  "Omni 1":      "#10b981", // green
  "Omni 2":      "#0ea5e9", // blue
  "Omni 3":      "#7c3aed", // purple
  "Master Omni": "#d4860a", // gold
};

interface StaffMember {
  id: string;
  email: string;
  username: string;
  rank: string;
  created_at: string;
}

// Shape returned by /api/admin/customers
interface ApiCustomer {
  id: string;
  email: string;
  username: string;
  rank: string;
  created_at: string;
}

export default function StaffPage() {
  const [staff,   setStaff]   = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [busyId,  setBusyId]  = useState<string | null>(null);
  const [toast,   setToast]   = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/customers");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      const all = (json.customers ?? []) as ApiCustomer[];
      const onlyStaff = all
        .filter((c) => STAFF_RANKS.includes(c.rank as StaffRank))
        .sort((a, b) => {
          // Master Omni first, then Omni 3 → 1
          const order = { "Master Omni": 0, "Omni 3": 1, "Omni 2": 2, "Omni 1": 3 } as Record<string, number>;
          return (order[a.rank] ?? 9) - (order[b.rank] ?? 9);
        });
      setStaff(onlyStaff);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // Auto-dismiss toast after 4 seconds.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleResetPassword = async (member: StaffMember) => {
    const ok = window.confirm(
      `Send a password reset email to ${member.email}?\n\nThey'll get a link to set a new password.`,
    );
    if (!ok) return;
    setBusyId(member.id);
    try {
      const res = await fetch("/api/admin/customer-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password", userId: member.id, email: member.email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setToast({ kind: "success", text: `Reset email sent to ${member.email}` });
    } catch (e) {
      setToast({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async (member: StaffMember) => {
    const ok = window.confirm(
      `Remove staff access from ${member.username || member.email}?\n\nTheir rank will be reset to Default. They keep their account but lose admin-portal access.`,
    );
    if (!ok) return;
    setBusyId(member.id);
    try {
      const res = await fetch("/api/admin/customer-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_rank", userId: member.id, email: member.email, value: "Default" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setToast({ kind: "success", text: `${member.username || member.email} is no longer staff` });
      await fetchStaff();
    } catch (e) {
      setToast({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>Staff</h1>
            <p className="text-sm mt-1" style={{ color: "#e8d5a0", opacity: 0.5 }}>
              {loading
                ? "Loading…"
                : `${staff.length} staff member${staff.length !== 1 ? "s" : ""} (Omni 1, 2, 3, Master Omni)`}
            </p>
          </div>
          <p className="text-xs max-w-xs text-right" style={{ color: "#e8d5a0", opacity: 0.45 }}>
            To promote a customer to staff, go to <strong>Customer Database</strong> and change their rank.
          </p>
        </div>

        {/* Toast / inline message */}
        {toast && (
          <div
            className="px-4 py-3 rounded-xl text-sm"
            style={{
              backgroundColor: toast.kind === "success" ? "#10b98122" : "#dc262622",
              border:          `1px solid ${toast.kind === "success" ? "#10b98144" : "#dc262644"}`,
              color:           toast.kind === "success" ? "#34d399" : "#f87171",
            }}
          >
            {toast.text}
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: "#dc262622", border: "1px solid #dc262644", color: "#f87171" }}>
            {error}
          </div>
        )}

        {/* Rank legend */}
        <div className="flex gap-2 flex-wrap">
          {STAFF_RANKS.map((r) => (
            <span key={r} className="text-xs px-3 py-1 rounded-full font-bold"
              style={{ backgroundColor: RANK_COLORS[r] + "22", color: RANK_COLORS[r], border: `1px solid ${RANK_COLORS[r]}44` }}>
              {r}
            </span>
          ))}
        </div>

        {/* Staff list */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #2e2050" }}>
          <div className="grid px-5 py-3 text-xs font-bold uppercase tracking-wide"
            style={{ gridTemplateColumns: "1fr 1.4fr 140px 110px 200px", backgroundColor: "#0d091a", color: "#e8d5a0", opacity: 0.5 }}>
            <span>Display Name</span>
            <span>Email</span>
            <span>Rank</span>
            <span>Joined</span>
            <span className="text-center">Actions</span>
          </div>

          {!loading && staff.length === 0 && (
            <div className="px-5 py-10 text-center text-sm"
              style={{ color: "#e8d5a0", opacity: 0.4, backgroundColor: "#1e1530" }}>
              No staff yet. Promote a customer from Customer Database.
            </div>
          )}

          {staff.map((member, i) => {
            const rankColor = RANK_COLORS[member.rank as StaffRank] ?? "#e8d5a0";
            const isBusy = busyId === member.id;
            return (
              <div key={member.id} className="grid px-5 py-4 items-center gap-2"
                style={{
                  gridTemplateColumns: "1fr 1.4fr 140px 110px 200px",
                  borderTop: i === 0 ? "none" : "1px solid #2e2050",
                  backgroundColor: i % 2 === 0 ? "#1e1530" : "#1a1228",
                }}>
                <span className="text-sm font-medium truncate" style={{ color: "#e8d5a0" }}>
                  {member.username || <span style={{ opacity: 0.4 }}>—</span>}
                </span>
                <span className="text-sm truncate" style={{ color: "#e8d5a0", opacity: 0.75 }}>
                  {member.email}
                </span>
                <span className="text-xs px-2 py-1 rounded-full w-fit font-bold"
                  style={{ backgroundColor: rankColor + "22", color: rankColor, border: `1px solid ${rankColor}44` }}>
                  {member.rank}
                </span>
                <span className="text-xs" style={{ color: "#e8d5a0", opacity: 0.5 }}>
                  {new Date(member.created_at).toLocaleDateString()}
                </span>
                <div className="flex justify-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleResetPassword(member)}
                    disabled={isBusy}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: "#0ea5e922",
                      color: "#0ea5e9",
                      border: "1px solid #0ea5e944",
                      cursor: isBusy ? "wait" : "pointer",
                      opacity: isBusy ? 0.5 : 1,
                    }}
                  >
                    {isBusy ? "…" : "Reset Password"}
                  </button>
                  <button
                    onClick={() => handleRevoke(member)}
                    disabled={isBusy}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: "#dc262622",
                      color: "#f87171",
                      border: "1px solid #dc262644",
                      cursor: isBusy ? "wait" : "pointer",
                      opacity: isBusy ? 0.5 : 1,
                    }}
                  >
                    {isBusy ? "…" : "Revoke"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
