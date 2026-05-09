"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/components/LanguageProvider";

export default function WelcomePage() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ backgroundColor: "#120d1f" }}>
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(-40%, -40%)", opacity: 0.7 }} />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(40%, 40%)", opacity: 0.7 }} />

      <Navbar />

      <main className="flex-1 flex items-center justify-center px-6 py-16 relative z-10">
        <div className="w-full max-w-md text-center flex flex-col items-center gap-5">
          <div className="text-6xl">🎉</div>
          <h2 className="text-3xl font-extrabold" style={{ color: "#e8d5a0" }}>{t.welcome.title}</h2>
          <p className="text-sm leading-relaxed" style={{ color: "#e8d5a0", opacity: 0.65 }}>
            {t.welcome.activeA}<br />
            {t.welcome.activeB}{" "}
            <strong style={{ color: "#d4860a" }}>{t.welcome.freeCoins}</strong>{" "}
            {t.welcome.activeC}
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
            <Link
              href="/arena"
              className="w-full py-3 rounded-full font-bold text-sm text-center"
              style={{ backgroundColor: "#d4860a", color: "#120d1f" }}
            >
              {t.welcome.enterArena}
            </Link>
            <Link
              href="/login"
              className="w-full py-3 rounded-full font-bold text-sm text-center"
              style={{ backgroundColor: "transparent", border: "1px solid #2e2050", color: "#e8d5a0" }}
            >
              {t.welcome.logIn}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
