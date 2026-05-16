"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";

const DEFAULT_ABOUT   = "Omni-Verse is a competitive trivia gaming platform designed for teams and groups who love to challenge their knowledge. Inspired by Jeopardy, we bring the excitement of live trivia into a modern, digital format — available in both English and Arabic.";
const DEFAULT_PRIVACY = "We respect your privacy. Your personal data is never sold to third parties. We only collect what is necessary to run the platform and keep your account secure.";
const DEFAULT_POLICY  = "By using Omni-Verse, you agree to play fair and not abuse the platform. Any attempt to exploit the system may result in account suspension.";

export default function AboutPage() {
  const { t } = useLanguage();
  const [aboutText,   setAboutText]   = useState(DEFAULT_ABOUT);
  const [privacyText, setPrivacyText] = useState(DEFAULT_PRIVACY);
  const [policyText,  setPolicyText]  = useState(DEFAULT_POLICY);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("key, value")
          .in("key", ["about_text", "privacy_text", "policy_text"]);
        if (data) {
          const map = Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value]));
          if (map.about_text)   setAboutText(map.about_text);
          if (map.privacy_text) setPrivacyText(map.privacy_text);
          if (map.policy_text)  setPolicyText(map.policy_text);
        }
      } catch { /* keep defaults */ }
    })();
  }, []);

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ backgroundColor: "transparent" }}>
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(-40%, -40%)", opacity: 0.7 }} />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(40%, 40%)", opacity: 0.7 }} />

      <Navbar />

      <main className="flex-1 px-6 py-16 relative z-10">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold" style={{ color: "#e8d5a0" }}>{t.about.title}</h1>
            <p className="mt-3 text-base" style={{ color: "#e8d5a0", opacity: 0.65 }}>{t.about.subtitle}</p>
          </div>

          <div className="rounded-2xl p-8 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            <h2 className="text-xl font-bold" style={{ color: "#d4860a" }}>{t.about.whatIsTitle}</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#e8d5a0", opacity: 0.8 }}>{aboutText}</p>
          </div>

          <div className="rounded-2xl p-8 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            <h2 className="text-xl font-bold" style={{ color: "#d4860a" }}>{t.about.howTitle}</h2>
            <div className="flex flex-col gap-3">
              {t.about.howSteps.map((text, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>
                    {i + 1}
                  </div>
                  <p className="text-sm pt-1" style={{ color: "#e8d5a0", opacity: 0.8 }}>{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-8 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            <h2 className="text-xl font-bold" style={{ color: "#d4860a" }}>{t.about.privacyTitle}</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#e8d5a0", opacity: 0.8 }}>{privacyText}</p>
          </div>

          <div className="rounded-2xl p-8 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            <h2 className="text-xl font-bold" style={{ color: "#d4860a" }}>{t.about.termsTitle}</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#e8d5a0", opacity: 0.8 }}>{policyText}</p>
          </div>

          <div className="text-center">
            <Link href="/arena" className="inline-block px-8 py-3 rounded-full font-bold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>
              {t.about.enterArena}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
