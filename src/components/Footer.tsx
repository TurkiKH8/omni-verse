import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="w-full px-6 py-8 mt-auto"
      style={{ borderTop: "1px solid #2e2050" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold" style={{ color: "#d4860a" }}>Omni</span>
          <span className="text-lg font-bold" style={{ color: "#e8d5a0" }}>-Verse</span>
        </div>
        <div className="flex items-center gap-6 text-sm" style={{ color: "#e8d5a0", opacity: 0.6 }}>
          <Link href="/about" className="hover:opacity-100 transition-opacity">About Us</Link>
          <Link href="/buy" className="hover:opacity-100 transition-opacity">Buy</Link>
          <Link href="/admin" className="hover:opacity-100 transition-opacity">Admin</Link>
        </div>
        <p className="text-xs" style={{ color: "#e8d5a0", opacity: 0.4 }}>
          © {new Date().getFullYear()} Omni-Verse. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
