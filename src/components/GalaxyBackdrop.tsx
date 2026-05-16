"use client";

import { usePathname } from "next/navigation";

/**
 * Purely decorative, customer-facing galaxy backdrop.
 *
 * Renders the branded "arc" artwork as a fixed layer that sits BEHIND all
 * page content (the customer page wrappers are transparent so it shows
 * through). It is intentionally faint and barely moves. No logic, no data.
 *
 * Hidden on the admin portal and inside the arena game so those stay clean
 * and focused. All motion is disabled automatically for visitors who have
 * "reduce motion" turned on (handled in globals.css).
 */
export default function GalaxyBackdrop() {
  const pathname = usePathname();

  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/arena") ||
    pathname?.startsWith("/auth")
  ) {
    return null;
  }

  // A few faint, slowly twinkling stars scattered over the arc area (right side).
  const stars = [
    { top: "16%", right: "23%", delay: "0s" },
    { top: "29%", right: "11%", delay: "2.4s" },
    { top: "43%", right: "27%", delay: "4.1s" },
    { top: "61%", right: "15%", delay: "1.3s" },
    { top: "72%", right: "29%", delay: "3.6s" },
    { top: "52%", right: "7%", delay: "5.2s" },
  ];

  return (
    <div className="galaxy-backdrop" aria-hidden>
      <div className="galaxy-arc" />
      <div className="galaxy-twinkle">
        {stars.map((s, i) => (
          <span key={i} style={{ top: s.top, right: s.right, animationDelay: s.delay }} />
        ))}
      </div>
    </div>
  );
}
