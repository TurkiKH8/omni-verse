"use client";

import { usePathname } from "next/navigation";

/**
 * Purely decorative galaxy backdrop — built entirely in code, no image.
 *
 * An edge-on spiral galaxy (bright off-centre core, glowing lens-shaped
 * disk, a dark dust lane, soft halo) inspired by the NGC 3749 reference,
 * drawn with layered CSS gradients in the brand palette. Around it floats
 * a faint starfield; the biggest stars carry subtle diffraction spikes.
 *
 * The whole galaxy slowly fades in and out, the spiral gently swings, and
 * every star drifts on its own slow randomised path. It sits BEHIND all
 * page content, low and tilted so titles/buttons up top stay clear.
 *
 * Shows on every customer page AND the arena (category pick + game board).
 * Hidden only on the admin portal and transient auth redirect pages.
 * All motion stops automatically for "reduce motion" visitors (globals.css).
 *
 * Random values use a FIXED seed so server and browser render identical
 * markup (no hydration mismatch) while still looking scattered.
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

const STARS = Array.from({ length: 70 }, () => {
  const top = (rng() * 100).toFixed(2);
  const left = (rng() * 100).toFixed(2);
  const sizeNum = 0.9 + rng() * 3.1; // 0.9 – 4.0 px
  const size = sizeNum.toFixed(2);
  const twinkleDur = (3.5 + rng() * 5.5).toFixed(2); // 3.5 – 9 s
  const twinkleDelay = (rng() * 9).toFixed(2);
  const driftName = `gd${1 + Math.floor(rng() * 4)}`; // gd1 – gd4
  const driftDur = (16 + rng() * 24).toFixed(2); // 16 – 40 s slow swing
  const driftDelay = (rng() * 12).toFixed(2);
  const gold = rng() > 0.5; // ~half look like warm distant galaxies
  const big = sizeNum > 3.3; // a few get diffraction spikes
  return { top, left, size, twinkleDur, twinkleDelay, driftName, driftDur, driftDelay, gold, big };
});

export default function GalaxyBackdrop() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/auth")) {
    return null;
  }

  return (
    <div className="galaxy-backdrop" aria-hidden>
      <div className="galaxy-fade">
        {/* The edge-on spiral galaxy, low and tilted */}
        <div className="galaxy-spiral">
          <div className="gs-halo" />
          <div className="gs-disk" />
          <div className="gs-dust" />
          <div className="gs-core" />
        </div>

        {/* Surrounding starfield */}
        {STARS.map((s, i) => (
          <span
            key={i}
            className={s.big ? "galaxy-star big" : "galaxy-star"}
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
