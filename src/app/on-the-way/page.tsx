import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function OnTheWayPage() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ backgroundColor: "#120d1f" }}>
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(-40%, -40%)", opacity: 0.7 }} />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(40%, 40%)", opacity: 0.7 }} />

      <Navbar />

      <main className="flex-1 flex items-center justify-center px-6 py-16 relative z-10">
        <div className="max-w-lg mx-auto text-center flex flex-col items-center gap-6">
          <div className="text-6xl">🚀</div>
          <h1 className="text-4xl font-extrabold" style={{ color: "#e8d5a0" }}>On The Way</h1>
          <p className="text-base leading-relaxed" style={{ color: "#e8d5a0", opacity: 0.65 }}>
            Something exciting is being built. This feature is coming soon to the Omni-Verse arena. Stay tuned!
          </p>
          <Link
            href="/"
            className="px-8 py-3 rounded-full font-bold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#d4860a", color: "#120d1f" }}
          >
            Back to Home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
