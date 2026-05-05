"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { icon: "📊", label: "Dashboard", href: "/admin/dashboard" },
  { icon: "🗂️", label: "Categories", href: "/admin/categories" },
  { icon: "❓", label: "Questions", href: "/admin/questions" },
  { icon: "⚙️", label: "Settings", href: "/admin/settings" },
  { icon: "👤", label: "Developer", href: "/admin/developer" },
  { icon: "📋", label: "Audit Log", href: "/admin/audit-log" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 shrink-0 flex flex-col min-h-screen"
      style={{ backgroundColor: "#0d091a", borderRight: "1px solid #2e2050" }}
    >
      {/* Brand */}
      <div className="px-6 py-5" style={{ borderBottom: "1px solid #2e2050" }}>
        <Link href="/admin/dashboard" className="flex items-center gap-1">
          <span className="text-lg font-extrabold" style={{ color: "#d4860a" }}>Omni</span>
          <span className="text-lg font-extrabold" style={{ color: "#e8d5a0" }}>-Verse</span>
        </Link>
        <p className="text-xs mt-0.5" style={{ color: "#e8d5a0", opacity: 0.4 }}>Admin Portal</p>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor: active ? "#d4860a22" : "transparent",
                color: active ? "#d4860a" : "#e8d5a0",
                opacity: active ? 1 : 0.7,
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 flex flex-col gap-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
          style={{ color: "#e8d5a0", opacity: 0.45 }}
        >
          <span>←</span>
          Back to Site
        </Link>
        <button
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left"
          style={{ color: "#ef4444", opacity: 0.7 }}
        >
          <span>🚪</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
