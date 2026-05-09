"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";
import LanguageToggle from "@/components/LanguageToggle";
import ProfileEditModal from "@/components/ProfileEditModal";

export default function Navbar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [coins,    setCoins]    = useState<number | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Built per-render so labels respond immediately to language changes
  const navLinks = [
    { label: t.nav.home,  href: "/" },
    { label: t.nav.arena, href: "/arena" },
    { label: t.nav.about, href: "/about" },
    { label: t.nav.buy,   href: "/buy" },
  ];

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const loadUser = async (userId: string, email: string | undefined) => {
      // Show fallback immediately so the navbar never sticks on Login/Sign Up
      const fallbackName = email?.split("@")[0] || "User";
      setUsername(fallbackName);
      setCoins(0);

      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        const { data } = await supabase
          .from("profiles")
          .select("username, category_coins")
          .eq("id", userId)
          .abortSignal(ctrl.signal)
          .maybeSingle();
        clearTimeout(t);
        if (data?.username) setUsername(data.username);
        if (typeof data?.category_coins === "number") setCoins(data.category_coins);
      } catch {
        // fallback already set above
      }
    };

    // Quick initial check — race against 4s timeout so an orphaned auth lock can't hang the navbar
    Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("getSession timeout")), 4000)),
    ])
      .then((res) => {
        const session = (res as { data: { session: { user: { id: string; email?: string | null } } | null } }).data.session;
        if (session?.user) loadUser(session.user.id, session.user.email ?? undefined);
      })
      .catch(() => {
        // Fall back to reading the session token straight from localStorage
        try {
          const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(/https?:\/\/([^.]+)\./)?.[1];
          if (!projectRef || typeof window === "undefined") return;
          const raw = window.localStorage.getItem(`sb-${projectRef}-auth-token`);
          if (!raw) return;
          const parsed = JSON.parse(raw) as { access_token?: string; user?: { id: string; email?: string } };
          // The user payload may live under a nested key depending on supabase-js version
          const tokenParts = parsed.access_token?.split(".");
          if (tokenParts && tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1])) as { sub?: string; email?: string };
            if (payload.sub) loadUser(payload.sub, payload.email);
          }
        } catch { /* ignore */ }
      });

    // Keep in sync with auth changes (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        loadUser(session.user.id, session.user.email ?? undefined);
      } else {
        setUsername(null);
        setCoins(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    setUsername(null);
    setCoins(null);
    // Race signOut against a 3s timeout — if the auth lock hangs, force redirect anyway
    await Promise.race([
      supabase.auth.signOut(),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]).catch(() => {});
    // Belt-and-suspenders: clear the local session token directly
    try {
      const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(/https?:\/\/([^.]+)\./)?.[1];
      if (projectRef && typeof window !== "undefined") {
        window.localStorage.removeItem(`sb-${projectRef}-auth-token`);
      }
    } catch { /* ignore */ }
    window.location.href = "/";
  };

  return (
    <nav
      className="w-full px-6 py-4 flex items-center justify-between relative z-50"
      style={{ borderBottom: "1px solid #2e2050" }}
    >
      {/* Logo + quick Sign Out */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-wide" style={{ color: "#d4860a" }}>Omni</span>
          <span className="text-2xl font-bold tracking-wide" style={{ color: "#e8d5a0" }}>-Verse</span>
        </Link>
        <button
          onClick={username ? handleSignOut : undefined}
          disabled={!username}
          aria-label={username ? "Sign out" : "Sign out (you are not logged in)"}
          title={username ? "Sign out" : "Not logged in"}
          className="flex items-center justify-center w-9 h-9 rounded-full transition-opacity"
          style={{
            border: "1px solid #2e2050",
            color: "#e8d5a0",
            opacity: username ? 1 : 0.3,
            cursor: username ? "pointer" : "not-allowed",
            backgroundColor: username ? "#1e1530" : "transparent",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      {/* Desktop Nav Links */}
      <div className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href}
            className="text-sm font-medium transition-colors"
            style={{ color: pathname === link.href ? "#d4860a" : "#e8d5a0", opacity: pathname === link.href ? 1 : 0.75 }}>
            {link.label}
          </Link>
        ))}
      </div>

      {/* Desktop Auth — Login/Sign Up shown immediately; swaps to username once session loads */}
      <div className="hidden md:flex items-center gap-3">
        <LanguageToggle />
        {username ? (
          <div className="flex items-center gap-4">
            {coins !== null && (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold"
                style={{ backgroundColor: "#d4860a22", color: "#d4860a", border: "1px solid #d4860a44" }}>
                🪙 {coins}
              </span>
            )}
            <span className="text-sm flex items-center gap-2" style={{ color: "#e8d5a0" }}>
              {t.nav.hi}{" "}
              <span className="font-bold" style={{ color: "#d4860a" }}>{username}</span>
              <button
                onClick={() => setProfileOpen(true)}
                title={t.profile.title}
                aria-label={t.profile.editAria}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-100"
                style={{ border: "1px solid #2e2050", color: "#e8d5a0", opacity: 0.7, backgroundColor: "#1e1530" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
            </span>
            <button onClick={handleSignOut}
              className="px-5 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-80"
              style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>
              {t.nav.signOut}
            </button>
          </div>
        ) : (
          <>
            <Link href="/login"
              className="px-5 py-2 rounded-full text-sm font-medium"
              style={{ border: "1px solid #d4860a", color: "#d4860a" }}>
              {t.nav.login}
            </Link>
            <Link href="/signup"
              className="px-5 py-2 rounded-full text-sm font-bold hover:opacity-90"
              style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>
              {t.nav.signup}
            </Link>
          </>
        )}
      </div>

      {/* Mobile language toggle + hamburger — language always reachable on phones */}
      <div className="md:hidden flex items-center gap-2">
        <LanguageToggle />
        <button className="flex flex-col gap-1.5 p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <span className="block w-6 h-0.5" style={{ backgroundColor: "#e8d5a0" }} />
          <span className="block w-6 h-0.5" style={{ backgroundColor: "#e8d5a0" }} />
          <span className="block w-6 h-0.5" style={{ backgroundColor: "#e8d5a0" }} />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 flex flex-col gap-4 px-6 py-6 md:hidden"
          style={{ backgroundColor: "#1e1530", borderBottom: "1px solid #2e2050" }}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
              className="text-sm font-medium"
              style={{ color: pathname === link.href ? "#d4860a" : "#e8d5a0" }}>
              {link.label}
            </Link>
          ))}

          {username ? (
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: "#e8d5a0" }}>
                  {t.nav.hi} <span className="font-bold" style={{ color: "#d4860a" }}>{username}</span>
                </p>
                {coins !== null && (
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
                    style={{ backgroundColor: "#d4860a22", color: "#d4860a", border: "1px solid #d4860a44" }}>
                    🪙 {coins}
                  </span>
                )}
              </div>
              <button
                onClick={() => { setMenuOpen(false); setProfileOpen(true); }}
                className="w-full text-center px-4 py-2 rounded-full text-sm font-medium flex items-center justify-center gap-2"
                style={{ border: "1px solid #d4860a", color: "#d4860a" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                {t.profile.title}
              </button>
              <button onClick={() => { setMenuOpen(false); handleSignOut(); }}
                className="w-full text-center px-4 py-2 rounded-full text-sm font-medium"
                style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>
                {t.nav.signOut}
              </button>
            </div>
          ) : (
            <div className="flex gap-3 mt-2">
              <Link href="/login" onClick={() => setMenuOpen(false)}
                className="flex-1 text-center px-4 py-2 rounded-full text-sm font-medium"
                style={{ border: "1px solid #d4860a", color: "#d4860a" }}>
                {t.nav.login}
              </Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)}
                className="flex-1 text-center px-4 py-2 rounded-full text-sm font-bold"
                style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>
                {t.nav.signup}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Edit-profile modal — mounted from the navbar so it overlays every page. */}
      <ProfileEditModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSaved={(newName) => {
          if (newName) setUsername(newName);
        }}
      />
    </nav>
  );
}
