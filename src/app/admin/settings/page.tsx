"use client";

import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

type Tab = "about" | "privacy" | "policy" | "music" | "database" | "developers";

const DEFAULTS = {
  about_text:    "Omni-Verse is a competitive trivia gaming platform designed for teams and groups who love to challenge their knowledge. Inspired by Jeopardy, we bring the excitement of live trivia into a modern, digital format — available in both English and Arabic.",
  privacy_text:  "We respect your privacy. Your personal data is never sold to third parties. We only collect what is necessary to run the platform and keep your account secure.",
  policy_text:   "By using Omni-Verse, you agree to play fair and not abuse the platform. Any attempt to exploit the system may result in account suspension.",
  music_enabled: "true",
  music_volume:  "60",
};

export default function SettingsPage() {
  const [activeTab, setActiveTab]   = useState<Tab>("about");
  const [aboutText, setAboutText]   = useState(DEFAULTS.about_text);
  const [privacyText, setPrivacyText] = useState(DEFAULTS.privacy_text);
  const [policyText, setPolicyText] = useState(DEFAULTS.policy_text);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume]   = useState(60);
  const [saved, setSaved]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);

  // DB stats
  const [stats, setStats] = useState({ questions: 0, categories: 0, sessions: 0, users: 0 });

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }

    // Load site settings
    supabase.from("site_settings").select("key, value").then(({ data }) => {
      if (data) {
        const map = Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value]));
        if (map.about_text)    setAboutText(map.about_text);
        if (map.privacy_text)  setPrivacyText(map.privacy_text);
        if (map.policy_text)   setPolicyText(map.policy_text);
        if (map.music_enabled !== undefined) setMusicEnabled(map.music_enabled === "true");
        if (map.music_volume)  setMusicVolume(parseInt(map.music_volume));
      }
      setLoading(false);
    });

    // Load real DB stats
    Promise.all([
      supabase.from("questions").select("id", { count: "exact", head: true }),
      supabase.from("categories").select("id", { count: "exact", head: true }),
      supabase.from("sessions").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]).then(([q, c, s, u]) => {
      setStats({
        questions:  q.count  ?? 0,
        categories: c.count  ?? 0,
        sessions:   s.count  ?? 0,
        users:      u.count  ?? 0,
      });
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    if (isSupabaseConfigured) {
      const rows = [
        { key: "about_text",    value: aboutText },
        { key: "privacy_text",  value: privacyText },
        { key: "policy_text",   value: policyText },
        { key: "music_enabled", value: String(musicEnabled) },
        { key: "music_volume",  value: String(musicVolume) },
      ];
      await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "about",      label: "About Us",   icon: "ℹ️" },
    { key: "privacy",    label: "Privacy",     icon: "🔒" },
    { key: "policy",     label: "Policy",      icon: "📜" },
    { key: "music",      label: "BG Music",    icon: "🎵" },
    { key: "database",   label: "Database",    icon: "🗄️" },
    { key: "developers", label: "Developers",  icon: "💻" },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>Settings</h1>
          <p className="text-sm mt-1" style={{ color: "#e8d5a0", opacity: 0.5 }}>
            Manage your platform configuration
            {!isSupabaseConfigured && <span style={{ color: "#f87171" }}> · Supabase not connected (demo mode)</span>}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor: activeTab === tab.key ? "#d4860a22" : "#1e1530",
                border: `1px solid ${activeTab === tab.key ? "#d4860a" : "#2e2050"}`,
                color: activeTab === tab.key ? "#d4860a" : "#e8d5a0",
                opacity: activeTab === tab.key ? 1 : 0.7,
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="rounded-2xl p-7 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>

          {activeTab === "about" && (
            <>
              <div>
                <h2 className="font-bold text-base" style={{ color: "#e8d5a0" }}>About Us Text</h2>
                <p className="text-xs mt-1" style={{ color: "#e8d5a0", opacity: 0.45 }}>This text appears on the About Us page of the website.</p>
              </div>
              {loading ? (
                <div className="text-sm" style={{ color: "#e8d5a0", opacity: 0.4 }}>Loading…</div>
              ) : (
                <textarea
                  value={aboutText}
                  onChange={(e) => setAboutText(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                  style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
                />
              )}
            </>
          )}

          {activeTab === "privacy" && (
            <>
              <div>
                <h2 className="font-bold text-base" style={{ color: "#e8d5a0" }}>Privacy Policy Text</h2>
                <p className="text-xs mt-1" style={{ color: "#e8d5a0", opacity: 0.45 }}>Displayed on the Privacy Policy page.</p>
              </div>
              {loading ? (
                <div className="text-sm" style={{ color: "#e8d5a0", opacity: 0.4 }}>Loading…</div>
              ) : (
                <textarea
                  value={privacyText}
                  onChange={(e) => setPrivacyText(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                  style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
                />
              )}
            </>
          )}

          {activeTab === "policy" && (
            <>
              <div>
                <h2 className="font-bold text-base" style={{ color: "#e8d5a0" }}>Terms of Use</h2>
                <p className="text-xs mt-1" style={{ color: "#e8d5a0", opacity: 0.45 }}>Displayed on the Terms of Use page.</p>
              </div>
              {loading ? (
                <div className="text-sm" style={{ color: "#e8d5a0", opacity: 0.4 }}>Loading…</div>
              ) : (
                <textarea
                  value={policyText}
                  onChange={(e) => setPolicyText(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                  style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
                />
              )}
            </>
          )}

          {activeTab === "music" && (
            <div className="flex flex-col gap-5">
              <h2 className="font-bold text-base" style={{ color: "#e8d5a0" }}>Background Music</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Enable Background Music</p>
                  <p className="text-xs mt-0.5" style={{ color: "#e8d5a0", opacity: 0.5 }}>Play music during game sessions</p>
                </div>
                <button
                  onClick={() => setMusicEnabled(!musicEnabled)}
                  className="w-12 h-6 rounded-full relative transition-all"
                  style={{ backgroundColor: musicEnabled ? "#d4860a" : "#2e2050" }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                    style={{ backgroundColor: "#fff", left: musicEnabled ? "calc(100% - 22px)" : "2px" }}
                  />
                </button>
              </div>
              {musicEnabled && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>
                    Volume: <span style={{ color: "#d4860a" }}>{musicVolume}%</span>
                  </label>
                  <input
                    type="range" min={0} max={100} value={musicVolume}
                    onChange={(e) => setMusicVolume(parseInt(e.target.value))}
                    className="w-full" style={{ accentColor: "#d4860a" }}
                  />
                </div>
              )}
              <div className="p-4 rounded-xl" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050" }}>
                <p className="text-xs" style={{ color: "#e8d5a0", opacity: 0.5 }}>Music file upload coming soon.</p>
              </div>
            </div>
          )}

          {activeTab === "database" && (
            <div className="flex flex-col gap-5">
              <h2 className="font-bold text-base" style={{ color: "#e8d5a0" }}>Database Stats</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Total Questions",  value: stats.questions },
                  { label: "Total Categories", value: stats.categories },
                  { label: "Total Sessions",   value: stats.sessions },
                  { label: "Total Users",      value: stats.users },
                ].map((stat) => (
                  <div key={stat.label} className="p-4 rounded-xl" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050" }}>
                    <p className="text-xl font-extrabold" style={{ color: "#d4860a" }}>{stat.value.toLocaleString()}</p>
                    <p className="text-xs mt-1" style={{ color: "#e8d5a0", opacity: 0.55 }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "developers" && (
            <div className="flex flex-col gap-5">
              <h2 className="font-bold text-base" style={{ color: "#e8d5a0" }}>Developer Access</h2>
              <div className="flex flex-col gap-3">
                {[{ name: "Turki Al-Khaldi", role: "Founder & Lead Dev", email: "turkinalkhaldi@gmail.com" }].map((dev) => (
                  <div key={dev.email} className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: "#d4860a22", color: "#d4860a" }}>
                        {dev.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#e8d5a0" }}>{dev.name}</p>
                        <p className="text-xs" style={{ color: "#e8d5a0", opacity: 0.5 }}>{dev.email}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "#16a34a22", color: "#4ade80" }}>{dev.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save button — not shown on database tab */}
          {activeTab !== "database" && activeTab !== "developers" && (
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="px-8 py-2.5 rounded-full text-sm font-bold hover:opacity-90"
                style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: saving || loading ? 0.5 : 1 }}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              {saved && <span className="text-sm" style={{ color: "#4ade80" }}>✓ Saved to database!</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
