import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="w-full px-6 py-8 mt-auto"
      style={{ borderTop: "1px solid #2e2050" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Omni-Verse home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Omni-Verse" className="h-8 w-auto object-contain" />
          <span className="text-base font-bold tracking-wide" style={{ color: "#e8d5a0" }}>
            <span style={{ color: "#d4860a" }}>Omni</span>-Verse
          </span>
        </Link>
        <div className="flex items-center gap-6 text-sm" style={{ color: "#e8d5a0", opacity: 0.6 }}>
          <Link href="/about"   className="hover:opacity-100 transition-opacity">About Us</Link>
          <Link href="/privacy" className="hover:opacity-100 transition-opacity">Privacy</Link>
          <Link href="/policy"  className="hover:opacity-100 transition-opacity">Terms</Link>
          <Link href="/buy"     className="hover:opacity-100 transition-opacity">Buy</Link>
        </div>
        <p className="text-xs" style={{ color: "#e8d5a0", opacity: 0.4 }}>
          © {new Date().getFullYear()} Omni-Verse. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
