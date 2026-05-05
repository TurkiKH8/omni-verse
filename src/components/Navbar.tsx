"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Arena", href: "/arena" },
  { label: "About Us", href: "/about" },
  { label: "Buy", href: "/buy" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className="w-full px-6 py-4 flex items-center justify-between relative z-50"
      style={{ borderBottom: "1px solid #2e2050" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <span
          className="text-2xl font-bold tracking-wide"
          style={{ color: "#d4860a" }}
        >
          Omni
        </span>
        <span
          className="text-2xl font-bold tracking-wide"
          style={{ color: "#e8d5a0" }}
        >
          -Verse
        </span>
      </Link>

      {/* Desktop Nav Links */}
      <div className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm font-medium transition-colors"
            style={{
              color: pathname === link.href ? "#d4860a" : "#e8d5a0",
              opacity: pathname === link.href ? 1 : 0.75,
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Auth Buttons */}
      <div className="hidden md:flex items-center gap-3">
        <Link
          href="/login"
          className="px-5 py-2 rounded-full text-sm font-medium transition-colors"
          style={{
            border: "1px solid #d4860a",
            color: "#d4860a",
          }}
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="px-5 py-2 rounded-full text-sm font-bold transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "#d4860a",
            color: "#120d1f",
          }}
        >
          Sign Up
        </Link>
      </div>

      {/* Mobile Hamburger */}
      <button
        className="md:hidden flex flex-col gap-1.5 p-2"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <span
          className="block w-6 h-0.5 transition-all"
          style={{ backgroundColor: "#e8d5a0" }}
        />
        <span
          className="block w-6 h-0.5 transition-all"
          style={{ backgroundColor: "#e8d5a0" }}
        />
        <span
          className="block w-6 h-0.5 transition-all"
          style={{ backgroundColor: "#e8d5a0" }}
        />
      </button>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          className="absolute top-full left-0 right-0 flex flex-col gap-4 px-6 py-6 md:hidden"
          style={{ backgroundColor: "#1e1530", borderBottom: "1px solid #2e2050" }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium"
              style={{ color: pathname === link.href ? "#d4860a" : "#e8d5a0" }}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex gap-3 mt-2">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="flex-1 text-center px-4 py-2 rounded-full text-sm font-medium"
              style={{ border: "1px solid #d4860a", color: "#d4860a" }}
            >
              Login
            </Link>
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className="flex-1 text-center px-4 py-2 rounded-full text-sm font-bold"
              style={{ backgroundColor: "#d4860a", color: "#120d1f" }}
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
