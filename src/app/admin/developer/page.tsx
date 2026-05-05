"use client";

import { useState } from "react";

export default function DeveloperPage() {
  const [name, setName] = useState("Turki Al-Khaldi");
  const [email, setEmail] = useState("turkinalkhaldi@gmail.com");
  const [role, setRole] = useState("Founder & Lead Developer");
  const [bio, setBio] = useState("Building Omni-Verse from the ground up. Passionate about interactive gaming experiences and trivia.");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const activity = [
    { action: "Added 6 questions to Science", time: "2 hours ago" },
    { action: "Updated About Us text", time: "Yesterday" },
    { action: "Created category: Food & Drink", time: "2 days ago" },
    { action: "Bulk uploaded 18 questions", time: "3 days ago" },
    { action: "Modified settings: Music volume", time: "5 days ago" },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>Developer Profile</h1>
          <p className="text-sm mt-1" style={{ color: "#e8d5a0", opacity: 0.5 }}>Manage your developer identity and access</p>
        </div>

        {/* Avatar + Name */}
        <div className="flex items-center gap-5">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-extrabold"
            style={{ backgroundColor: "#d4860a22", border: "2px solid #d4860a55", color: "#d4860a" }}
          >
            {name[0]}
          </div>
          <div>
            <p className="text-xl font-extrabold" style={{ color: "#e8d5a0" }}>{name}</p>
            <p className="text-sm mt-0.5" style={{ color: "#d4860a" }}>{role}</p>
            <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{ backgroundColor: "#16a34a22", color: "#4ade80" }}>
              Active
            </span>
          </div>
        </div>

        {/* Profile Form */}
        <div className="rounded-2xl p-7 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
          <h2 className="font-bold text-base" style={{ color: "#e8d5a0" }}>Profile Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Role / Title</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
            />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSave} className="px-8 py-2.5 rounded-full text-sm font-bold hover:opacity-90" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>
              Save Changes
            </button>
            {saved && <span className="text-sm" style={{ color: "#4ade80" }}>✓ Saved!</span>}
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-2xl p-7 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
          <h2 className="font-bold text-base" style={{ color: "#e8d5a0" }}>Change Password</h2>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Current Password</label>
            <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>New Password</label>
            <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
          </div>
          <button className="px-8 py-2.5 rounded-full text-sm font-bold w-fit hover:opacity-90" style={{ backgroundColor: "#7c3aed", color: "#fff" }}>
            Update Password
          </button>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl flex flex-col" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid #2e2050" }}>
            <h2 className="font-bold text-base" style={{ color: "#e8d5a0" }}>Recent Activity</h2>
          </div>
          {activity.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-6 py-3"
              style={{ borderTop: i === 0 ? "none" : "1px solid #2e2050" }}
            >
              <p className="text-sm" style={{ color: "#e8d5a0" }}>{item.action}</p>
              <p className="text-xs shrink-0 ml-4" style={{ color: "#e8d5a0", opacity: 0.4 }}>{item.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
