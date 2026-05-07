"use client";

import { useState, useEffect, useCallback } from "react";

type Customer = {
  id: string;
  email: string;
  username: string;
  rank: string;
  category_coins: number;
  is_banned: boolean;
  phone_number: string | null;
  is_admin: boolean;
  developer_level: string | null;
  created_at: string;
};

const RANKS = ["Omni 1", "Omni 2", "Omni 3", "Master Omni"];

function getSuccessMsg(type: string): string {
  const msgs: Record<string, string> = {
    ban: "User banned successfully",
    unban: "User unbanned successfully",
    delete: "User deleted",
    reset_password: "Password reset link sent",
    change_email: "Email updated",
    change_phone: "Phone number updated",
    change_display_name: "Display name updated",
    add_coins: "Coins added",
    change_rank: "Rank updated",
  };
  return msgs[type] ?? "Done";
}

function getModalTitle(type: string): string {
  const titles: Record<string, string> = {
    delete: "Delete User",
    change_email: "Change Email",
    change_phone: "Change Phone Number",
    change_display_name: "Change Display Name",
    add_coins: "Add Category Coins",
    change_rank: "Change Rank",
  };
  return titles[type] ?? "Confirm Action";
}

function getInputLabel(type: string): string {
  const labels: Record<string, string> = {
    change_email: "New Email Address",
    change_phone: "Phone Number",
    change_display_name: "New Display Name",
  };
  return labels[type] ?? "Value";
}

function rankColor(rank: string): string {
  if (rank === "Master Omni") return "#d4860a";
  if (rank === "Omni 3") return "#7c3aed";
  if (rank === "Omni 2") return "#0ea5e9";
  return "#e8d5a066";
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionModal, setActionModal] = useState<{ type: string; customer: Customer } | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customers");
      const { customers: data, error } = await res.json();
      if (error) { setLoading(false); return; }
      setCustomers(data ?? []);
    } catch { /* network error */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = customers.filter(
    (c) =>
      c.username.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const callAction = async (type: string, userId: string, email: string, value?: string) => {
    const res = await fetch("/api/admin/customer-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: type, userId, email, value }),
    });
    return res.json() as Promise<{ success?: boolean; error?: string }>;
  };

  const doModal = async () => {
    if (!actionModal) return;
    setProcessing(true);
    const { type, customer } = actionModal;
    const data = await callAction(type, customer.id, customer.email, inputValue);
    if (data.error) {
      setFeedback({ msg: data.error, ok: false });
    } else {
      setFeedback({ msg: getSuccessMsg(type), ok: true });
      await fetchCustomers();
    }
    setProcessing(false);
    setActionModal(null);
    setInputValue("");
    setTimeout(() => setFeedback(null), 3500);
  };

  const quickAction = async (type: string, customer: Customer) => {
    setProcessing(true);
    const data = await callAction(type, customer.id, customer.email);
    setFeedback({ msg: data.error ?? getSuccessMsg(type), ok: !data.error });
    if (!data.error) await fetchCustomers();
    setProcessing(false);
    setTimeout(() => setFeedback(null), 3500);
  };

  const openModal = (type: string, customer: Customer, defaultVal = "") => {
    setInputValue(defaultVal);
    setActionModal({ type, customer });
  };

  const needsInput = actionModal
    ? ["change_email", "change_phone", "change_display_name", "add_coins", "change_rank"].includes(actionModal.type)
    : false;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>Customer Database</h1>
            <p className="text-sm mt-1" style={{ color: "#e8d5a0", opacity: 0.5 }}>
              {loading ? "Loading…" : `${customers.length} accounts total`}
            </p>
          </div>
          <button
            onClick={fetchCustomers}
            disabled={loading || processing}
            className="px-4 py-2 rounded-full text-sm font-medium"
            style={{ border: "1px solid #2e2050", color: "#e8d5a0", opacity: loading ? 0.5 : 1 }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className="px-4 py-3 rounded-xl text-sm font-medium"
            style={{
              backgroundColor: feedback.ok ? "#16a34a22" : "#dc262622",
              border: `1px solid ${feedback.ok ? "#4ade8044" : "#f8717144"}`,
              color: feedback.ok ? "#4ade80" : "#f87171",
            }}
          >
            {feedback.msg}
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="Search by display name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0" }}
        />

        {/* Table */}
        <div className="overflow-x-auto">
          <div className="rounded-2xl overflow-hidden min-w-[960px]" style={{ border: "1px solid #2e2050" }}>
            {/* Table header */}
            <div
              className="grid px-4 py-3 text-xs font-bold uppercase tracking-wide gap-3"
              style={{
                gridTemplateColumns: "160px 200px 110px 70px 80px 60px 1fr",
                backgroundColor: "#0d091a",
                color: "#e8d5a0",
                opacity: 0.5,
              }}
            >
              <span>Display Name</span>
              <span>Email</span>
              <span>Rank</span>
              <span className="text-center">Coins</span>
              <span className="text-center">Status</span>
              <span className="text-center">Phone</span>
              <span className="text-center">Actions</span>
            </div>

            {/* Rows */}
            {filtered.map((c, i) => (
              <div
                key={c.id}
                className="grid px-4 py-3 items-center gap-3"
                style={{
                  gridTemplateColumns: "160px 200px 110px 70px 80px 60px 1fr",
                  borderTop: i === 0 ? "none" : "1px solid #2e2050",
                  backgroundColor: i % 2 === 0 ? "#1e1530" : "#1a1228",
                }}
              >
                {/* Name */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-medium truncate" style={{ color: "#e8d5a0" }}>
                    {c.username || "—"}
                  </span>
                  {c.is_admin && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: "#d4860a22", color: "#d4860a", border: "1px solid #d4860a44" }}
                    >
                      Admin
                    </span>
                  )}
                </div>

                {/* Email */}
                <span className="text-xs truncate" style={{ color: "#e8d5a0", opacity: 0.65 }}>
                  {c.email}
                </span>

                {/* Rank */}
                <span
                  className="text-xs px-2 py-1 rounded-full text-center font-medium"
                  style={{
                    backgroundColor: rankColor(c.rank) + "22",
                    color: rankColor(c.rank),
                    border: `1px solid ${rankColor(c.rank)}44`,
                  }}
                >
                  {c.rank}
                </span>

                {/* Coins */}
                <span className="text-sm text-center font-bold" style={{ color: "#d4860a" }}>
                  {c.category_coins}
                </span>

                {/* Status */}
                <div className="flex justify-center">
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor: c.is_banned ? "#dc262622" : "#16a34a22",
                      color: c.is_banned ? "#f87171" : "#4ade80",
                      border: `1px solid ${c.is_banned ? "#f8717144" : "#4ade8044"}`,
                    }}
                  >
                    {c.is_banned ? "Banned" : "Active"}
                  </span>
                </div>

                {/* Phone indicator */}
                <span className="text-xs text-center" style={{ color: "#e8d5a0", opacity: 0.5 }}>
                  {c.phone_number ? "✓" : "—"}
                </span>

                {/* Actions */}
                <div className="flex flex-wrap gap-1">
                  {c.is_banned ? (
                    <ActionBtn onClick={() => quickAction("unban", c)} color="green" disabled={processing}>
                      Unban
                    </ActionBtn>
                  ) : (
                    <ActionBtn onClick={() => quickAction("ban", c)} color="red" disabled={processing}>
                      Ban
                    </ActionBtn>
                  )}
                  <ActionBtn onClick={() => quickAction("reset_password", c)} color="purple" disabled={processing}>
                    ↺ PW
                  </ActionBtn>
                  <ActionBtn onClick={() => openModal("change_display_name", c, c.username)} color="blue" disabled={processing}>
                    Name
                  </ActionBtn>
                  <ActionBtn onClick={() => openModal("change_email", c, c.email)} color="blue" disabled={processing}>
                    Email
                  </ActionBtn>
                  <ActionBtn onClick={() => openModal("change_phone", c, c.phone_number ?? "")} color="blue" disabled={processing}>
                    Phone
                  </ActionBtn>
                  <ActionBtn onClick={() => openModal("add_coins", c, "1")} color="gold" disabled={processing}>
                    +🪙
                  </ActionBtn>
                  <ActionBtn onClick={() => openModal("change_rank", c, c.rank)} color="green" disabled={processing}>
                    Rank
                  </ActionBtn>
                  <ActionBtn onClick={() => openModal("delete", c)} color="red" disabled={processing}>
                    Del
                  </ActionBtn>
                </div>
              </div>
            ))}

            {filtered.length === 0 && !loading && (
              <div
                className="px-5 py-10 text-center text-sm"
                style={{ color: "#e8d5a0", opacity: 0.4, backgroundColor: "#1e1530" }}
              >
                No customers found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "#00000099" }}>
          <div
            className="w-full max-w-sm rounded-2xl p-7 flex flex-col gap-5"
            style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}
          >
            <h2 className="text-lg font-extrabold" style={{ color: "#e8d5a0" }}>
              {getModalTitle(actionModal.type)}
            </h2>
            <p className="text-sm" style={{ color: "#e8d5a0", opacity: 0.6 }}>
              For:{" "}
              <span className="font-bold" style={{ color: "#d4860a" }}>
                {actionModal.customer.username || actionModal.customer.email}
              </span>
            </p>

            {actionModal.type === "delete" && (
              <p className="text-sm font-medium" style={{ color: "#f87171" }}>
                This permanently deletes the account and all its data. This cannot be undone.
              </p>
            )}

            {actionModal.type === "add_coins" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>
                  Number of coins to add
                </label>
                <input
                  type="number"
                  min="1"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
                  autoFocus
                />
              </div>
            )}

            {actionModal.type === "change_rank" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>New Rank</label>
                <select
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
                >
                  {RANKS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {["change_email", "change_phone", "change_display_name"].includes(actionModal.type) && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>
                  {getInputLabel(actionModal.type)}
                </label>
                <input
                  type={actionModal.type === "change_email" ? "email" : "text"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
                  autoFocus
                />
              </div>
            )}

            <div className="flex gap-3 mt-1">
              <button
                onClick={() => { setActionModal(null); setInputValue(""); }}
                className="flex-1 py-2.5 rounded-full text-sm font-medium"
                style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}
              >
                Cancel
              </button>
              <button
                onClick={doModal}
                disabled={processing || (needsInput && !inputValue && actionModal?.type !== "change_rank")}
                className="flex-1 py-2.5 rounded-full text-sm font-bold"
                style={{
                  backgroundColor: actionModal.type === "delete" ? "#dc2626" : "#d4860a",
                  color: "#fff",
                  opacity: processing ? 0.5 : 1,
                }}
              >
                {processing ? "Processing…" : actionModal.type === "delete" ? "Delete Forever" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  color,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  color: "red" | "green" | "blue" | "purple" | "gold";
  disabled?: boolean;
}) {
  const styles: Record<string, { bg: string; text: string }> = {
    red:    { bg: "#dc262622", text: "#f87171" },
    green:  { bg: "#16a34a22", text: "#4ade80" },
    blue:   { bg: "#0ea5e922", text: "#38bdf8" },
    purple: { bg: "#7c3aed22", text: "#a78bfa" },
    gold:   { bg: "#d4860a22", text: "#d4860a" },
  };
  const s = styles[color];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2 py-1 rounded-lg text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.text, opacity: disabled ? 0.5 : 1 }}
    >
      {children}
    </button>
  );
}
