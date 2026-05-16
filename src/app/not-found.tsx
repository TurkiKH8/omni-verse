import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden" style={{ backgroundColor: "transparent" }}>
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(-40%, -40%)", opacity: 0.7 }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #3d0a0a 0%, transparent 70%)", transform: "translate(40%, 40%)", opacity: 0.7 }} />

      <div className="relative z-10 text-center flex flex-col items-center gap-6 max-w-md">
        <div className="text-8xl font-extrabold" style={{ color: "#d4860a", opacity: 0.2 }}>404</div>
        <h1 className="text-3xl font-extrabold -mt-8" style={{ color: "#e8d5a0" }}>Page Not Found</h1>
        <p className="text-base leading-relaxed" style={{ color: "#e8d5a0", opacity: 0.6 }}>
          This question isn&apos;t in the trivia bank. The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <div className="flex gap-4 mt-2">
          <Link href="/" className="px-8 py-3 rounded-full font-bold text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>
            Go Home
          </Link>
          <Link href="/arena" className="px-8 py-3 rounded-full text-sm font-medium hover:opacity-80 transition-opacity" style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>
            Enter Arena
          </Link>
        </div>
      </div>
    </div>
  );
}
