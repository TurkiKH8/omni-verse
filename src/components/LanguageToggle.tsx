"use client";

import { useLanguage } from "./LanguageProvider";

// Inline SVG flags so we don't add an extra HTTP request and they always
// render at exactly the right size.

function FlagUS({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-label="USA flag">
      <rect width="32" height="32" rx="4" fill="#b22234" />
      {/* white stripes */}
      {[4.92, 9.84, 14.76, 19.68, 24.60].map((y) => (
        <rect key={y} y={y} width="32" height="2.46" fill="#fff" />
      ))}
      {/* blue canton */}
      <rect width="14" height="13" rx="0" fill="#3c3b6e" />
      {/* simplified stars dots */}
      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 5 }).map((_, col) => (
          <circle key={`${row}-${col}`} cx={1.4 + col * 2.8} cy={1.4 + row * 3} r="0.6" fill="#fff" />
        ))
      )}
    </svg>
  );
}

function FlagSA({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-label="Saudi Arabia flag">
      <rect width="32" height="32" rx="4" fill="#006c35" />
      {/* Sword (simplified) */}
      <rect x="6" y="22" width="20" height="1.4" fill="#fff" />
      <polygon points="26,22.7 28.5,22.7 26,21" fill="#fff" />
      {/* Shahada placeholder — three short white bars */}
      <rect x="6"  y="10" width="6" height="1.4" fill="#fff" />
      <rect x="13" y="10" width="6" height="1.4" fill="#fff" />
      <rect x="20" y="10" width="6" height="1.4" fill="#fff" />
      <rect x="9"  y="14" width="14" height="1.4" fill="#fff" />
    </svg>
  );
}

export default function LanguageToggle() {
  const { lang, toggle } = useLanguage();
  return (
    <button
      onClick={toggle}
      title={lang === "en" ? "تبديل إلى العربية" : "Switch to English"}
      aria-label={lang === "en" ? "Switch to Arabic" : "Switch to English"}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-opacity hover:opacity-80"
      style={{ border: "1px solid #2e2050", color: "#e8d5a0", backgroundColor: "#1e1530" }}
    >
      {lang === "en" ? <FlagUS /> : <FlagSA />}
      <span>{lang === "en" ? "EN" : "ع"}</span>
    </button>
  );
}
