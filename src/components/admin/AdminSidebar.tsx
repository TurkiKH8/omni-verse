"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface NavItem {
  icon: string;
  label: string;
  href: string;
  adminOnly?: boolean;
  masterOnly?: boolean;
  staffVisible?: boolean;
}

const STAFF_RANKS = ["Omni 1", "Omni 2", "Omni 3", "Master Omni"];

const navItems: NavItem[] = [
  { icon: "📊", label: "Dashboard",          href: "/admin/dashboard"                                        },
  { icon: "🗂️", label: "Categories",         href: "/admin/categories", adminOnly: true, staffVisible: true  },
  { icon: "❓", label: "Questions",           href: "/admin/questions"                                        },
  { icon: "👥", label: "Accounts",            href: "/admin/accounts",   adminOnly: true                      },
  { icon: "🧑‍💼", label: "Customer Database",  href: "/admin/customers",  adminOnly: true                      },
  { icon: "🏅", label: "Ranks",               href: "/admin/ranks",         adminOnly: true, masterOnly: true    },
  { icon: "✍️", label: "Site Copy",           href: "/admin/translations",  adminOnly: true, masterOnly: true    },
  { icon: "⚙️", label: "Settings",            href: "/admin/settings",      adminOnly: true                      },
  { icon: "👤", label: "Developer",           href: "/admin/developer",  adminOnly: true                      },
  { icon: "📋", label: "Audit Log",           href: "/admin/audit-log",  adminOnly: true                      },
];

interface Props {
  onClose?: () => void;
  isAdmin?: boolean;
  developerLevel?: string | null;
  rank?: string | null;
}

export default function AdminSidebar({ onClose, isAdmin = false, developerLevel = null, rank = null }: Props) {
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const visible = navItems.filter((item) => {
    if (rank === "Master Omni") return true;
    if (item.masterOnly) return false;
    if (isAdmin) return true;
    if (item.staffVisible) return rank !== null && STAFF_RANKS.includes(rank);
    return !item.adminOnly;
  });

  const roleBadge = isAdmin
    ? { label: rank === "Master Omni" ? "Master Omni" : "Admin", color: "#d4860a" }
    : developerLevel === "basic" && rank === "Omni 3"
    ? { label: "Omni 3",          color: "#7c3aed" }
    : developerLevel === "basic" && rank === "Omni 2"
    ? { label: "Omni 2",          color: "#0ea5e9" }
    : developerLevel === "basic"
    ? { label: "Basic Developer", color: "#7c3aed" }
    : null;

  return (
    <aside
      className="w-60 h-full flex flex-col min-h-screen"
      style={{ backgroundColor: "#0d091a", borderRight: "1px solid #2e2050" }}
    >
      {/* Brand + close */}
      <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid #2e2050" }}>
        <Link href="/admin/dashboard" onClick={onClose} className="flex items-center gap-2" aria-label="Omni-Verse admin home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Omni-Verse" className="h-8 w-auto object-contain" />
          <span className="text-sm font-extrabold tracking-wide" style={{ color: "#e8d5a0" }}>
            <span style={{ color: "#d4860a" }}>Omni</span>-Verse
          </span>
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

      {/* Role badge */}
      <div className="px-6 pb-3 pt-1 flex items-center gap-2">
        <p className="text-xs" style={{ color: "#e8d5a0", opacity: 0.4 }}>Admin Portal</p>
        {roleBadge && (
          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: roleBadge.color + "22", color: roleBadge.color, border: `1px solid ${roleBadge.color}44` }}>
            {roleBadge.label}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3 py-2 flex-1">
        {visible.map((item) => {
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

      {/* Bottom */}
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
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left"
          style={{ color: "#ef4444", opacity: 0.7 }}
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}
