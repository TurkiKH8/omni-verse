"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { icon: "📊", label: "Dashboard",  href: "/admin/dashboard"  },
  { icon: "🗂️", label: "Categories", href: "/admin/categories" },
  { icon: "❓", label: "Questions",  href: "/admin/questions"  },
  { icon: "⚙️", label: "Settings",   href: "/admin/settings"   },
  { icon: "👤", label: "Developer",  href: "/admin/developer"  },
  { icon: "📋", label: "Audit Log",  href: "/admin/audit-log"  },
];

export default function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 h-full flex flex-col min-h-screen"
      style={{ backgroundColor: "#0d091a", borderRight: "1px solid #2e2050" }}
    >
      {/* Brand + close button on mobile */}
      <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid #2e2050" }}>
        <Link href="/admin/dashboard" onClick={onClose} className="flex items-center gap-1">
          <span className="text-lg font-extrabold" style={{ color: "#d4860a" }}>Omni</span>
          <span className="text-lg font-extrabold" style={{ color: "#e8d5a0" }}>-Verse</span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden text-lg p-1"
            style={{ color: "#e8d5a0", opacity: 0.5 }}
            aria-label="Close menu"
          >
            ✕
          </button>
        )}
      </div>
      <p className="px-6 text-xs pb-3 pt-1" style={{ color: "#e8d5a0", opacity: 0.4 }}>Admin Portal</p>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 px-3 py-2 flex-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
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

      {/* Bottom links */}
      <div className="px-3 pb-5 flex flex-col gap-1">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
          style={{ color: "#e8d5a0", opacity: 0.45 }}
        >
          <span>←</span> Back to Site
        </Link>
        <button
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left"
          style={{ color: "#ef4444", opacity: 0.7 }}
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}
