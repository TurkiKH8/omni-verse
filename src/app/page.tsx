import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ backgroundColor: "#120d1f" }}>
      {/* Corner blobs */}
      <div
        className="absolute top-0 left-0 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)",
          transform: "translate(-40%, -40%)",
          opacity: 0.7,
        }}
      />
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)",
          transform: "translate(40%, -40%)",
          opacity: 0.7,
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)",
          transform: "translate(-40%, 40%)",
          opacity: 0.7,
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)",
          transform: "translate(40%, 40%)",
          opacity: 0.7,
        }}
      />

      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 relative z-10">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
          {/* Badge */}
          <div
            className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
            style={{ backgroundColor: "#1e1530", color: "#d4860a", border: "1px solid #d4860a33" }}
          >
            Now Live — Beta
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
            <span style={{ color: "#e8d5a0" }}>The Ultimate </span>
            <span style={{ color: "#d4860a" }}>Trivia</span>
            <br />
            <span style={{ color: "#e8d5a0" }}>Arena</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl max-w-xl leading-relaxed" style={{ color: "#e8d5a0", opacity: 0.75 }}>
            Choose your categories, challenge your team, and battle through 36 questions in our Jeopardy-style competitive trivia experience. Available in English & Arabic.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            <Link
              href="/arena"
              className="px-8 py-3 rounded-full text-base font-bold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#d4860a", color: "#120d1f" }}
            >
              Enter the Arena
            </Link>
            <Link
              href="/about"
              className="px-8 py-3 rounded-full text-base font-medium transition-opacity hover:opacity-80"
              style={{ border: "1px solid #e8d5a055", color: "#e8d5a0" }}
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-24 max-w-5xl w-full">
          {[
            {
              icon: "🏆",
              title: "Competitive Play",
              desc: "Up to 6 teams battling head-to-head across handpicked trivia categories.",
            },
            {
              icon: "⚡",
              title: "60-Second Timer",
              desc: "Every question is a race. Think fast, answer faster, score big.",
            },
            {
              icon: "🌐",
              title: "Bilingual",
              desc: "Fully playable in both English and Arabic for a seamless local experience.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl text-center"
              style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}
            >
              <span className="text-3xl">{card.icon}</span>
              <h3 className="font-bold text-base" style={{ color: "#e8d5a0" }}>
                {card.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#e8d5a0", opacity: 0.65 }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Pricing teaser */}
        <div
          className="mt-16 px-8 py-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 max-w-2xl w-full"
          style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}
        >
          <div className="flex-1 text-left">
            <h3 className="font-bold text-lg" style={{ color: "#e8d5a0" }}>
              Pay Per Session
            </h3>
            <p className="text-sm mt-1" style={{ color: "#e8d5a0", opacity: 0.65 }}>
              Only ~10 SAR per category session. No subscriptions, no commitments.
            </p>
          </div>
          <Link
            href="/buy"
            className="px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#7c3aed", color: "#fff" }}
          >
            View Pricing
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
