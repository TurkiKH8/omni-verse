"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

const navLinks = [
  { label: "Home",     href: "/" },
  { label: "Arena",   href: "/arena" },
  { label: "About Us", href: "/about" },
  { label: "Buy",     href: "/buy" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [username,   setUsername]   = useState<string | null>(null);
  const [coins,      setCoins]      = useState<number | null>(null);
  const [authReady,  setAuthReady]  = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) { setAuthReady(true); return; }

    const loadUser = async (userId: string, email: string | undefined) => {
      const { data } = await supabase
        .from("profiles")
        .select("username, category_coins")
        .eq("id", userId)
        .maybeSingle();
      setUsername(data?.username || email?.split("@")[0] || "User");
      setCoins(data?.category_coins ?? 0);
      setAuthReady(true);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUser(session.user.id, session.user.email ?? undefined);
      else setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        loadUser(session.user.id, session.user.email ?? undefined);
      } else {
        setUsername(null);
        setCoins(null);
        setAuthReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUsername(null);
    router.push("/");
  };

  return (
    <nav
      className="w-full px-6 py-4 flex items-center justify-between relative z-50"
      style={{ borderBottom: "1px solid #2e2050" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <span className="text-2xl font-bold tracking-wide" style={{ color: "#d4860a" }}>Omni</span>
        <span className="text-2xl font-bold tracking-wide" style={{ color: "#e8d5a0" }}>-Verse</span>
      </Link>

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

      {/* Desktop Auth */}
      <div className="hidden md:flex items-center gap-3">
        {authReady && (
          username ? (
            <div className="flex items-center gap-4">
              {coins !== null && (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold"
                  style={{ backgroundColor: "#d4860a22", color: "#d4860a", border: "1px solid #d4860a44" }}>
                  🪙 {coins}
                </span>
              )}
              <span className="text-sm" style={{ color: "#e8d5a0" }}>
                Hi,{" "}
                <span className="font-bold" style={{ color: "#d4860a" }}>{username}</span>
              </span>
              <button onClick={handleSignOut}
                className="px-5 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-80"
                style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>
                Sign Out
              </button>
            </div>
          ) : (
            <>
              <Link href="/login"
                className="px-5 py-2 rounded-full text-sm font-medium"
                style={{ border: "1px solid #d4860a", color: "#d4860a" }}>
                Login
              </Link>
              <Link href="/signup"
                className="px-5 py-2 rounded-full text-sm font-bold hover:opacity-90"
                style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>
                Sign Up
              </Link>
            </>
          )
        )}
      </div>

      {/* Mobile Hamburger */}
      <button className="md:hidden flex flex-col gap-1.5 p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
        <span className="block w-6 h-0.5" style={{ backgroundColor: "#e8d5a0" }} />
        <span className="block w-6 h-0.5" style={{ backgroundColor: "#e8d5a0" }} />
        <span className="block w-6 h-0.5" style={{ backgroundColor: "#e8d5a0" }} />
      </button>

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

          {authReady && (
            username ? (
              <div className="flex flex-col gap-3 mt-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm" style={{ color: "#e8d5a0" }}>
                    Hi, <span className="font-bold" style={{ color: "#d4860a" }}>{username}</span>
                  </p>
                  {coins !== null && (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
                      style={{ backgroundColor: "#d4860a22", color: "#d4860a", border: "1px solid #d4860a44" }}>
                      🪙 {coins}
                    </span>
                  )}
                </div>
                <button onClick={() => { setMenuOpen(false); handleSignOut(); }}
                  className="w-full text-center px-4 py-2 rounded-full text-sm font-medium"
                  style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex gap-3 mt-2">
                <Link href="/login" onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center px-4 py-2 rounded-full text-sm font-medium"
                  style={{ border: "1px solid #d4860a", color: "#d4860a" }}>
                  Login
                </Link>
                <Link href="/signup" onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center px-4 py-2 rounded-full text-sm font-bold"
                  style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>
                  Sign Up
                </Link>
              </div>
            )
          )}
        </div>
      )}
    </nav>
  );
}
