"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

interface DevAccount {
  id: string;
  username: string | null;
  developer_level: string | null;
  created_at: string;
}

export default function AccountsPage() {
  const [accounts,     setAccounts]     = useState<DevAccount[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [level,        setLevel]        = useState("basic");
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState("");
  const [serviceKeyMissing, setServiceKeyMissing] = useState(false);

  const fetchAccounts = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, developer_level, created_at")
      .not("developer_level", "is", null)
      .order("created_at", { ascending: false });
    setAccounts((data as DevAccount[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleCreate = async () => {
    if (!email.trim() || !password) return;
    setSaving(true);
    setFormError("");

    const res = await fetch("/api/admin/create-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, developerLevel: level }),
    });

    const json = await res.json();

    if (!res.ok) {
      if (json.error?.includes("SUPABASE_SERVICE_ROLE_KEY")) {
        setServiceKeyMissing(true);
      }
      setFormError(json.error ?? "Something went wrong.");
      setSaving(false);
      return;
    }

    setEmail("");
    setPassword("");
    setLevel("basic");
    setShowForm(false);
    await fetchAccounts();
    setSaving(false);
  };

  const handleRevoke = async (id: string, username: string | null) => {
    await supabase.from("profiles").update({ developer_level: null }).eq("id", id);
    await supabase.from("audit_log").insert({
      action: "Revoked developer access",
      target: username ?? id,
      type: "update",
    });
    await fetchAccounts();
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>Developer Accounts</h1>
            <p className="text-sm mt-1" style={{ color: "#e8d5a0", opacity: 0.5 }}>
              {loading ? "Loading…" : `${accounts.length} developer${accounts.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={() => { setShowForm(true); setFormError(""); setServiceKeyMissing(false); }}
            className="px-5 py-2.5 rounded-full text-sm font-bold hover:opacity-90"
            style={{ backgroundColor: "#d4860a", color: "#120d1f" }}
          >
            + Add Developer
          </button>
        </div>

        {/* Role legend */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ backgroundColor: "#7c3aed22", border: "1px solid #7c3aed44" }}>
            <span className="font-bold" style={{ color: "#a78bfa" }}>Basic Developer</span>
            <span style={{ color: "#e8d5a0", opacity: 0.6 }}>— can add questions only</span>
          </div>
        </div>

        {/* Accounts list */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #2e2050" }}>
          <div className="grid px-5 py-3 text-xs font-bold uppercase tracking-wide"
            style={{ gridTemplateColumns: "1fr 160px 120px 100px", backgroundColor: "#0d091a", color: "#e8d5a0", opacity: 0.5 }}>
            <span>Username / ID</span>
            <span>Role</span>
            <span>Joined</span>
            <span className="text-center">Actions</span>
          </div>

          {accounts.length === 0 && !loading && (
            <div className="px-5 py-10 text-center text-sm" style={{ color: "#e8d5a0", opacity: 0.4, backgroundColor: "#1e1530" }}>
              No developer accounts yet. Click &quot;Add Developer&quot; to create one.
            </div>
          )}

          {accounts.map((acc, i) => (
            <div key={acc.id} className="grid px-5 py-4 items-center"
              style={{ gridTemplateColumns: "1fr 160px 120px 100px", borderTop: i === 0 ? "none" : "1px solid #2e2050", backgroundColor: i % 2 === 0 ? "#1e1530" : "#1a1228" }}>
              <span className="text-sm font-medium" style={{ color: "#e8d5a0" }}>
                {acc.username ?? <span style={{ opacity: 0.4 }}>—</span>}
              </span>
              <span className="text-xs px-2 py-1 rounded-full w-fit font-bold"
                style={{ backgroundColor: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44" }}>
                {acc.developer_level === "basic" ? "Basic Developer" : acc.developer_level}
              </span>
              <span className="text-xs" style={{ color: "#e8d5a0", opacity: 0.5 }}>
                {new Date(acc.created_at).toLocaleDateString()}
              </span>
              <div className="flex justify-center">
                <button
                  onClick={() => handleRevoke(acc.id, acc.username)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: "#dc262622", color: "#f87171" }}
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "#00000088" }}>
          <div className="w-full max-w-md rounded-2xl p-7 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            <h2 className="text-lg font-extrabold" style={{ color: "#e8d5a0" }}>New Developer Account</h2>

            {serviceKeyMissing && (
              <div className="px-4 py-3 rounded-xl text-xs" style={{ backgroundColor: "#d4860a22", border: "1px solid #d4860a44", color: "#e8d5a0" }}>
                <p className="font-bold mb-1" style={{ color: "#d4860a" }}>One-time setup needed:</p>
                <p>1. Open your project folder → open the file <code>.env.local</code></p>
                <p>2. Add this line: <code>SUPABASE_SERVICE_ROLE_KEY=your_key_here</code></p>
                <p>3. Get the key from: Supabase → Settings → API Keys → <strong>service_role</strong> (secret)</p>
                <p className="mt-1 opacity-60">After adding it, restart the dev server or redeploy.</p>
              </div>
            )}

            {formError && !serviceKeyMissing && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#dc262622", border: "1px solid #dc262644", color: "#f87171" }}>
                {formError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} autoFocus />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Password</label>
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password for them"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
              <p className="text-xs" style={{ color: "#e8d5a0", opacity: 0.4 }}>Share this password with the developer securely.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Role</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}>
                <option value="basic">Basic Developer — add questions only</option>
              </select>
            </div>

            <div className="flex gap-3 mt-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-full text-sm font-medium"
                style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>Cancel</button>
              <button onClick={handleCreate} disabled={saving || !email.trim() || !password}
                className="flex-1 py-2.5 rounded-full text-sm font-bold hover:opacity-90"
                style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: saving || !email || !password ? 0.4 : 1 }}>
                {saving ? "Creating…" : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
