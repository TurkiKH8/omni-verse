"use client";

import { useState } from "react";

type Tab = "about" | "privacy" | "policy" | "music" | "database" | "developers";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const [aboutText, setAboutText] = useState("Omni-Verse is a competitive trivia gaming platform designed for teams and groups who love to challenge their knowledge.");
  const [privacyText, setPrivacyText] = useState("We respect your privacy. Your personal data is never sold to third parties.");
  const [policyText, setPolicyText] = useState("By using Omni-Verse, you agree to play fair and not abuse the platform.");
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(60);
  const [saved, setSaved] = useState(false);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "about", label: "About Us", icon: "ℹ️" },
    { key: "privacy", label: "Privacy", icon: "🔒" },
    { key: "policy", label: "Policy", icon: "📜" },
    { key: "music", label: "BG Music", icon: "🎵" },
    { key: "database", label: "Database", icon: "🗄️" },
    { key: "developers", label: "Developers", icon: "💻" },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>Settings</h1>
          <p className="text-sm mt-1" style={{ color: "#e8d5a0", opacity: 0.5 }}>Manage your platform configuration</p>
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
              <h2 className="font-bold text-base" style={{ color: "#e8d5a0" }}>About Us Text</h2>
              <textarea
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
              />
            </>
          )}
          {activeTab === "privacy" && (
            <>
              <h2 className="font-bold text-base" style={{ color: "#e8d5a0" }}>Privacy Policy Text</h2>
              <textarea
                value={privacyText}
                onChange={(e) => setPrivacyText(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
              />
            </>
          )}
          {activeTab === "policy" && (
            <>
              <h2 className="font-bold text-base" style={{ color: "#e8d5a0" }}>Terms of Use</h2>
              <textarea
                value={policyText}
                onChange={(e) => setPolicyText(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
              />
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
                    style={{
                      backgroundColor: "#fff",
                      left: musicEnabled ? "calc(100% - 22px)" : "2px",
                    }}
                  />
                </button>
              </div>
              {musicEnabled && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>
                    Volume: <span style={{ color: "#d4860a" }}>{musicVolume}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(parseInt(e.target.value))}
                    className="w-full accent-orange-500"
                    style={{ accentColor: "#d4860a" }}
                  />
                </div>
              )}
              <div className="p-4 rounded-xl" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050" }}>
                <p className="text-xs" style={{ color: "#e8d5a0", opacity: 0.5 }}>Music file upload coming soon. You&apos;ll be able to upload a custom background track.</p>
              </div>
            </div>
          )}
          {activeTab === "database" && (
            <div className="flex flex-col gap-5">
              <h2 className="font-bold text-base" style={{ color: "#e8d5a0" }}>Database</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Total Questions", value: "72" },
                  { label: "Total Categories", value: "12" },
                  { label: "Total Sessions", value: "1,248" },
                  { label: "Total Users", value: "3,421" },
                ].map((stat) => (
                  <div key={stat.label} className="p-4 rounded-xl" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050" }}>
                    <p className="text-xl font-extrabold" style={{ color: "#d4860a" }}>{stat.value}</p>
                    <p className="text-xs mt-1" style={{ color: "#e8d5a0", opacity: 0.55 }}>{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button className="flex-1 py-2.5 rounded-full text-sm font-bold" style={{ backgroundColor: "#7c3aed22", border: "1px solid #7c3aed44", color: "#a78bfa" }}>
                  Export Data
                </button>
                <button className="flex-1 py-2.5 rounded-full text-sm font-bold" style={{ backgroundColor: "#dc262622", border: "1px solid #dc262644", color: "#f87171" }}>
                  Reset DB (Danger)
                </button>
              </div>
            </div>
          )}
          {activeTab === "developers" && (
            <div className="flex flex-col gap-5">
              <h2 className="font-bold text-base" style={{ color: "#e8d5a0" }}>Developer Access</h2>
              <div className="flex flex-col gap-3">
                {[
                  { name: "Turki Al-Khaldi", role: "Founder & Lead Dev", email: "turkinalkhaldi@gmail.com", active: true },
                ].map((dev) => (
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
              <button className="px-5 py-2.5 rounded-full text-sm font-bold w-fit" style={{ backgroundColor: "#d4860a22", border: "1px solid #d4860a44", color: "#d4860a" }}>
                + Invite Developer
              </button>
            </div>
          )}

          {/* Save button */}
          {activeTab !== "database" && (
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handleSave}
                className="px-8 py-2.5 rounded-full text-sm font-bold hover:opacity-90"
                style={{ backgroundColor: "#d4860a", color: "#120d1f" }}
              >
                Save Changes
              </button>
              {saved && (
                <span className="text-sm" style={{ color: "#4ade80" }}>✓ Saved!</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
