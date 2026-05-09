"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/components/LanguageProvider";

export default function Home() {
  const { t } = useLanguage();
  const cards = [
    { icon: "🏆", ...t.home.cardCompetitive },
    { icon: "⚡", ...t.home.cardTimer },
    { icon: "🌐", ...t.home.cardBilingual },
  ];

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ backgroundColor: "#120d1f" }}>
      {/* Corner blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(-40%, -40%)", opacity: 0.7 }} />
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(40%, -40%)", opacity: 0.7 }} />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(-40%, 40%)", opacity: 0.7 }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(40%, 40%)", opacity: 0.7 }} />

      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 relative z-10">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
          <div className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
            style={{ backgroundColor: "#1e1530", color: "#d4860a", border: "1px solid #d4860a33" }}>
            {t.home.badge}
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
            <span style={{ color: "#e8d5a0" }}>{t.home.titleA}</span>
            <span style={{ color: "#d4860a" }}>{t.home.titleB}</span>
            <br />
            <span style={{ color: "#e8d5a0" }}>{t.home.titleC}</span>
          </h1>

          <p className="text-lg md:text-xl max-w-xl leading-relaxed" style={{ color: "#e8d5a0", opacity: 0.75 }}>
            {t.home.subtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            <Link href="/arena"
              className="px-8 py-3 rounded-full text-base font-bold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>
              {t.home.enterArena}
            </Link>
            <Link href="/about"
              className="px-8 py-3 rounded-full text-base font-medium transition-opacity hover:opacity-80"
              style={{ border: "1px solid #e8d5a055", color: "#e8d5a0" }}>
              {t.home.learnMore}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-24 max-w-5xl w-full">
          {cards.map((card) => (
            <div key={card.title} className="flex flex-col items-center gap-3 p-6 rounded-2xl text-center"
              style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
              <span className="text-3xl">{card.icon}</span>
              <h3 className="font-bold text-base" style={{ color: "#e8d5a0" }}>{card.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#e8d5a0", opacity: 0.65 }}>{card.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 px-8 py-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 max-w-2xl w-full"
          style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
          <div className="flex-1 text-left">
            <h3 className="font-bold text-lg" style={{ color: "#e8d5a0" }}>{t.home.payTitle}</h3>
            <p className="text-sm mt-1" style={{ color: "#e8d5a0", opacity: 0.65 }}>{t.home.payDesc}</p>
          </div>
          <Link href="/buy"
            className="px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#7c3aed", color: "#fff" }}>
            {t.home.viewPricing}
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
