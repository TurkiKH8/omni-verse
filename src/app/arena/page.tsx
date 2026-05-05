import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ArenaGame from "@/components/arena/ArenaGame";

export default function ArenaPage() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ backgroundColor: "#120d1f" }}>
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(-40%, -40%)", opacity: 0.6 }} />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(40%, 40%)", opacity: 0.6 }} />

      <Navbar />

      <main className="flex-1 px-6 py-12 relative z-10">
        <ArenaGame />
      </main>

      <Footer />
    </div>
  );
}
