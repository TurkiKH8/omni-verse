"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";

type Props = {
  open: boolean;
  onClose: () => void;
  // Called after a successful save so the navbar can refresh the displayed name
  onSaved?: (newName?: string) => void;
};

export default function ProfileEditModal({ open, onClose, onSaved }: Props) {
  const { t } = useLanguage();

  // Field state
  const [name,        setName]        = useState("");
  const [email,       setEmail]       = useState("");
  const [phone,       setPhone]       = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPwd,  setConfirmPwd]  = useState("");
  const [currentPwd,  setCurrentPwd]  = useState("");

  // Originals so we can detect "did this change?"
  const [origName,  setOrigName]  = useState("");
  const [origEmail, setOrigEmail] = useState("");
  const [origPhone, setOrigPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [okMsg,   setOkMsg]   = useState("");

  // Load current values from Supabase when the modal opens.
  useEffect(() => {
    if (!open) return;
    setError(""); setOkMsg("");
    setNewPassword(""); setConfirmPwd(""); setCurrentPwd("");

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const meta = (user?.user_metadata ?? {}) as { full_name?: string; phone?: string };

        let currentName = meta.full_name ?? "";
        try {
          const { data } = await supabase.from("profiles").select("username").eq("id", user?.id ?? "").maybeSingle();
          if (data?.username) currentName = data.username;
        } catch { /* fall back to user_metadata.full_name */ }

        const e = user?.email ?? "";
        const p = meta.phone   ?? "";

        setName(currentName);   setOrigName(currentName);
        setEmail(e);            setOrigEmail(e);
        setPhone(p);            setOrigPhone(p);
      } catch { /* ignore — modal will show empty fields */ }
    })();
  }, [open]);

  if (!open) return null;

  const nameChanged  = name.trim()  !== origName.trim();
  const emailChanged = email.trim() !== origEmail.trim() && email.trim().length > 0;
  const phoneChanged = phone.trim() !== origPhone.trim();
  const wantsPwd     = newPassword.length > 0;
  const sensitive    = emailChanged || phoneChanged || wantsPwd;
  const anyChange    = nameChanged || sensitive;

  const handleSave = async () => {
    setError(""); setOkMsg("");

    if (!anyChange) {
      setError(t.profile.noChanges);
      return;
    }
    if (wantsPwd && newPassword !== confirmPwd) {
      setError(t.profile.passMismatch);
      return;
    }
    if (wantsPwd && newPassword.length < 6) {
      setError(t.profile.passShort);
      return;
    }
    if (sensitive && !currentPwd) {
      setError(t.profile.currentRequired);
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, string> = {};
      if (nameChanged)  payload.full_name        = name.trim();
      if (emailChanged) payload.email            = email.trim();
      if (phoneChanged) payload.phone            = phone.trim();
      if (wantsPwd)     payload.new_password     = newPassword;
      if (sensitive)    payload.current_password = currentPwd;

      const resp = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await resp.json() as { success?: boolean; error?: string };

      if (!resp.ok || !data.success) {
        setError(data.error || t.profile.tryAgain);
        setLoading(false);
        return;
      }

      setOkMsg(t.profile.saved);
      setLoading(false);
      onSaved?.(nameChanged ? name.trim() : undefined);
      // Close shortly so the user can read the success message
      setTimeout(() => { onClose(); }, 800);
    } catch {
      setError(t.profile.tryAgain);
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ backgroundColor: "#00000099" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-7 flex flex-col gap-5 max-h-screen overflow-y-auto"
        style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold" style={{ color: "#e8d5a0" }}>{t.profile.title}</h2>
          <button onClick={onClose} className="text-lg leading-none w-7 h-7 flex items-center justify-center rounded-full" style={{ color: "#e8d5a0", opacity: 0.5 }} aria-label="Close">×</button>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#dc262622", border: "1px solid #dc262644", color: "#f87171" }}>
            {error}
          </div>
        )}
        {okMsg && (
          <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#16a34a22", border: "1px solid #16a34a44", color: "#4ade80" }}>
            {okMsg}
          </div>
        )}

        {/* Display Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>{t.profile.displayName}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>
            {t.profile.email} <span className="text-xs" style={{ color: "#d4860a", opacity: 0.8 }}>· {t.profile.needsCurrent}</span>
          </label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>
            {t.profile.phone} <span className="text-xs" style={{ color: "#d4860a", opacity: 0.8 }}>· {t.profile.needsCurrent}</span>
          </label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+966 5X XXX XXXX"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
        </div>

        <div className="h-px" style={{ backgroundColor: "#2e2050" }} />

        {/* New Password (optional) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>
            {t.profile.newPassword} <span className="text-xs" style={{ color: "#e8d5a0", opacity: 0.4 }}>· {t.profile.optional}</span>
          </label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
        </div>
        {wantsPwd && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>{t.profile.confirmPassword}</label>
            <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
          </div>
        )}

        {/* Current password (always visible — required for sensitive changes) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>
            {t.profile.currentPassword} {sensitive && <span style={{ color: "#f87171" }}>*</span>}
          </label>
          <input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
          <p className="text-xs" style={{ color: "#e8d5a0", opacity: 0.5 }}>{t.profile.currentHint}</p>
        </div>

        <div className="flex gap-3 mt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-full text-sm font-medium" style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>{t.profile.cancel}</button>
          <button onClick={handleSave} disabled={loading || !anyChange}
            className="flex-1 py-2.5 rounded-full text-sm font-bold hover:opacity-90"
            style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: (loading || !anyChange) ? 0.4 : 1, cursor: (loading || !anyChange) ? "not-allowed" : "pointer" }}>
            {loading ? t.profile.saving : t.profile.save}
          </button>
        </div>
      </div>
    </div>
  );
}
