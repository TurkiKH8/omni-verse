"use client";

import { usePathname } from "next/navigation";

/**
 * Purely decorative galaxy backdrop — built entirely in code, no image.
 *
 * A faint starfield + a few soft planets sit BEHIND all page content (the
 * customer page wrappers are transparent so this shows through). The whole
 * galaxy slowly fades in and out, and every star/planet drifts on its own
 * slow, randomised "swing" path so it never looks synced or busy.
 *
 * Shows on every customer page AND the arena (category pick + game board).
 * Hidden only on the admin portal and transient auth redirect pages.
 * All motion stops automatically for "reduce motion" visitors (globals.css).
 *
 * The random positions/speeds are generated once with a FIXED seed, so the
 * server and browser render the exact same markup (no hydration mismatch)
 * while still looking scattered and organic.
 */

// Tiny deterministic pseudo-random generator (mulberry32).
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(20260517);

const STARS = Array.from({ length: 52 }, () => {
  const top = (rng() * 100).toFixed(2);
  const left = (rng() * 100).toFixed(2);
  const size = (1 + rng() * 2.6).toFixed(2); // 1 – 3.6 px
  const twinkleDur = (3.5 + rng() * 5.5).toFixed(2); // 3.5 – 9 s
  const twinkleDelay = (rng() * 9).toFixed(2);
  const driftName = `gd${1 + Math.floor(rng() * 4)}`; // gd1 – gd4
  const driftDur = (16 + rng() * 24).toFixed(2); // 16 – 40 s slow swing
  const driftDelay = (rng() * 12).toFixed(2);
  const gold = rng() > 0.6;
  return { top, left, size, twinkleDur, twinkleDelay, driftName, driftDur, driftDelay, gold };
});

const PLANETS = [
  {
    top: "16%", left: "82%", size: 280, drift: "gp1", dur: 66,
    bg: "radial-gradient(circle at 38% 36%, rgba(212,134,10,0.40), rgba(212,134,10,0) 70%)",
  },
  {
    top: "70%", left: "10%", size: 340, drift: "gp2", dur: 84,
    bg: "radial-gradient(circle at 40% 40%, rgba(124,58,237,0.34), rgba(124,58,237,0) 70%)",
  },
  {
    top: "42%", left: "52%", size: 210, drift: "gp3", dur: 76,
    bg: "radial-gradient(circle at 42% 40%, rgba(232,213,160,0.16), rgba(232,213,160,0) 70%)",
  },
];

export default function GalaxyBackdrop() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/auth")) {
    return null;
  }

  return (
    <div className="galaxy-backdrop" aria-hidden>
      <div className="galaxy-fade">
        {PLANETS.map((p, i) => (
          <span
            key={`p${i}`}
            className="galaxy-planet"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              background: p.bg,
              animation: `${p.drift} ${p.dur}s ease-in-out infinite alternate`,
            }}
          />
        ))}
        {STARS.map((s, i) => (
          <span
            key={i}
            className="galaxy-star"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              background: s.gold ? "#ffe6aa" : "#ffffff",
              animation:
                `galaxy-twinkle ${s.twinkleDur}s ease-in-out ${s.twinkleDelay}s infinite, ` +
                `${s.driftName} ${s.driftDur}s ease-in-out ${s.driftDelay}s infinite alternate`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
