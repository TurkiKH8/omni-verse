import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ backgroundColor: "#120d1f" }}>
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(-40%, -40%)", opacity: 0.7 }} />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(40%, 40%)", opacity: 0.7 }} />

      <Navbar />

      <main className="flex-1 px-6 py-16 relative z-10">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold" style={{ color: "#e8d5a0" }}>About Omni-Verse</h1>
            <p className="mt-3 text-base" style={{ color: "#e8d5a0", opacity: 0.65 }}>
              The story behind the arena
            </p>
          </div>

          <div className="rounded-2xl p-8 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            <h2 className="text-xl font-bold" style={{ color: "#d4860a" }}>What is Omni-Verse?</h2>
            <p className="text-sm leading-relaxed" style={{ color: "#e8d5a0", opacity: 0.8 }}>
              Omni-Verse is a competitive trivia gaming platform designed for teams and groups who love to challenge their knowledge. Inspired by Jeopardy, we bring the excitement of live trivia into a modern, digital format — available in both English and Arabic.
            </p>
          </div>

          <div className="rounded-2xl p-8 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            <h2 className="text-xl font-bold" style={{ color: "#d4860a" }}>How It Works</h2>
            <div className="flex flex-col gap-3">
              {[
                { step: "1", text: "Pick your trivia categories (up to 6)" },
                { step: "2", text: "Choose solo or team mode (up to 6 teams)" },
                { step: "3", text: "Name your session and enter the game board" },
                { step: "4", text: "Answer 36 questions with a 60-second timer each" },
                { step: "5", text: "Score points — 200, 400, or 600 per question" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>
                    {item.step}
                  </div>
                  <p className="text-sm pt-1" style={{ color: "#e8d5a0", opacity: 0.8 }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/arena"
              className="inline-block px-8 py-3 rounded-full font-bold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#d4860a", color: "#120d1f" }}
            >
              Enter the Arena
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
