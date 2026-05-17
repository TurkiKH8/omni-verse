"use client";

/**
 * Omni Guardian Run — a branded endless runner.
 *
 * The Guardian (hooded, cloaked, purple constellation glow, the
 * signature 2×3 glowing-ring face) dashes across the galaxy. Jump
 * the low asteroids, duck the high glitch-bars. Speed ramps up.
 *
 * Reward: beating the admin-set daily target grants coins ONCE per
 * day (2 normally, 6 for Omni 1/2/3 & Master Omni). The grant is
 * done entirely by the secure /api/guardian/claim server route —
 * the browser never gives itself coins.
 *
 * Everything is drawn in code (no image files), matching the
 * site's galaxy aesthetic and brand palette.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";

type Phase = "ready" | "running" | "paused" | "over";

interface Obstacle {
  x: number;
  kind: "low" | "high";
  w: number;
  h: number;
  seed: number;
}

const COL = {
  bg0: "#0a0713",
  bg1: "#160f28",
  cloak: "#0b0815",
  cloakEdge: "#1a1030",
  glow: "#7c3aed",
  glowBright: "#a78bfa",
  star: "#c4b5fd",
  gold: "#d4860a",
  cream: "#e8d5a0",
  danger: "#dc2626",
};

export default function GuardianRunPage() {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<Phase>("ready");
  const [phase, setPhase] = useState<Phase>("ready");
  const [scoreUI, setScoreUI] = useState(0);

  const [userId, setUserId] = useState<string | null>(null);
  const [best, setBest] = useState(0);
  const [target, setTarget] = useState(100);
  const [claimedToday, setClaimedToday] = useState(false);
  const [resultMsg, setResultMsg] = useState<string>("");

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // ── Load player context (target / best / claimed-today) ──────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id ?? null;
        if (cancelled) return;
        setUserId(uid);

        const cfgP = supabase.from("guardian_config").select("daily_target").eq("id", 1).maybeSingle();
        const profP = uid
          ? supabase.from("profiles").select("guardian_best").eq("id", uid).maybeSingle()
          : Promise.resolve({ data: null });
        const day = new Date().toISOString().slice(0, 10);
        const claimP = uid
          ? supabase.from("guardian_claims").select("claim_date").eq("user_id", uid).eq("claim_date", day).maybeSingle()
          : Promise.resolve({ data: null });

        const [cfg, prof, claim] = await Promise.all([cfgP, profP, claimP]);
        if (cancelled) return;
        if (cfg.data?.daily_target != null) setTarget(cfg.data.daily_target);
        if (prof.data?.guardian_best != null) setBest(prof.data.guardian_best);
        if (claim.data) setClaimedToday(true);
      } catch { /* play-for-fun fallback; no reward context */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── The game ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let W = 0, H = 0, dpr = 1;

    // Deterministic starfield (parallax, three depths).
    const stars = Array.from({ length: 90 }, (_, i) => ({
      x: Math.random(), y: Math.random() * 0.8,
      r: 0.4 + Math.random() * 1.8,
      depth: 0.2 + (i % 3) * 0.35,
      tw: Math.random() * Math.PI * 2,
    }));

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // World state
    const groundFrac = 0.82;            // ground line as fraction of H
    let gy = H * groundFrac;
    const gxBase = () => Math.max(70, W * 0.16); // Guardian x

    let py = 0;                 // vertical offset above ground (px, +up)
    let vy = 0;
    let ducking = false;
    let onGround = true;
    let speed = 0;
    let dist = 0;
    let obstacles: Obstacle[] = [];
    let spawnIn = 0;
    let runT = 0;
    let hitFlash = 0;
    let last = performance.now();

    const GRAV = 2600;          // px/s^2
    const JUMP_V = 920;         // px/s
    const BASE_SPEED = 360;     // px/s
    const guardianW = 46;
    const guardianH = 96;

    const reset = () => {
      gy = H * groundFrac;
      py = 0; vy = 0; ducking = false; onGround = true;
      speed = BASE_SPEED; dist = 0; obstacles = []; spawnIn = 0.6;
      runT = 0; hitFlash = 0;
    };

    const startRun = () => {
      reset();
      setResultMsg("");
      setScoreUI(0);
      setPhaseBoth("running");
      last = performance.now();
    };

    const jump = () => {
      if (phaseRef.current === "ready" || phaseRef.current === "over") { startRun(); return; }
      if (phaseRef.current === "paused") { setPhaseBoth("running"); last = performance.now(); return; }
      if (phaseRef.current !== "running") return;
      if (onGround) { vy = JUMP_V; onGround = false; }
    };
    const setDuck = (d: boolean) => { if (phaseRef.current === "running") ducking = d; };

    // ── Score submission (server decides reward) ───────────────────────────
    const finishRun = async (finalScore: number) => {
      setPhaseBoth("over");
      if (!isSupabaseConfigured || !userId) {
        setBest((b) => Math.max(b, finalScore));
        setResultMsg(userId === null ? "loginReward" : "");
        return;
      }
      try {
        const res = await fetch("/api/guardian/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, score: finalScore }),
        });
        const data = await res.json();
        if (typeof data.best === "number") setBest(data.best);
        if (typeof data.target === "number") setTarget(data.target);
        if (data.rewarded) { setClaimedToday(true); setResultMsg(`earned:${data.coins}`); }
        else if (data.alreadyClaimed) { setClaimedToday(true); setResultMsg("claimed"); }
        else setResultMsg("missed");
      } catch {
        setBest((b) => Math.max(b, finalScore));
        setResultMsg("");
      }
    };

    // ── Drawing the Omni Guardian (pure paths) ─────────────────────────────
    const drawGuardian = (cx: number, footY: number, t2: number, duck: boolean, hit: boolean) => {
      const scaleY = duck ? 0.62 : 1;
      const h = guardianH * scaleY;
      const w = guardianW * (duck ? 1.12 : 1);
      const topY = footY - h;
      const bob = Math.sin(t2 * 14) * (onGround ? 2.2 : 0);
      const sway = Math.sin(t2 * 6) * (onGround ? 6 : 14);
      ctx.save();
      ctx.translate(cx, bob);

      // Trailing tattered cape (behind body)
      ctx.beginPath();
      ctx.moveTo(-w * 0.1, topY + h * 0.18);
      ctx.quadraticCurveTo(-w * 0.9 - sway, topY + h * 0.5, -w * 0.5 - sway, footY);
      for (let i = 0; i < 4; i++) {
        const fx = -w * (0.5 - i * 0.12) - sway * (1 - i * 0.2);
        ctx.lineTo(fx - 6, footY + 10 + (i % 2) * 8);
        ctx.lineTo(fx + 4, footY - 2);
      }
      ctx.quadraticCurveTo(-w * 0.2, topY + h * 0.4, w * 0.1, topY + h * 0.2);
      ctx.closePath();
      const capeGrad = ctx.createLinearGradient(-w, topY, w * 0.2, footY);
      capeGrad.addColorStop(0, COL.cloak);
      capeGrad.addColorStop(1, COL.cloakEdge);
      ctx.fillStyle = capeGrad;
      ctx.fill();

      // Body / robe
      ctx.beginPath();
      ctx.moveTo(-w * 0.42, footY);
      ctx.quadraticCurveTo(-w * 0.5, topY + h * 0.4, -w * 0.16, topY + h * 0.16);
      ctx.quadraticCurveTo(0, topY - 2, w * 0.16, topY + h * 0.16);
      ctx.quadraticCurveTo(w * 0.5, topY + h * 0.4, w * 0.42, footY);
      ctx.closePath();
      ctx.fillStyle = COL.cloak;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = COL.cloakEdge;
      ctx.stroke();

      // Constellation glow lines on the cloak
      ctx.save();
      ctx.strokeStyle = COL.glow;
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t2 * 4);
      ctx.lineWidth = 1;
      ctx.shadowColor = COL.glow;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(-w * 0.28, topY + h * 0.35);
      ctx.lineTo(-w * 0.05, topY + h * 0.55);
      ctx.lineTo(-w * 0.22, footY - h * 0.12);
      ctx.lineTo(w * 0.12, topY + h * 0.62);
      ctx.stroke();
      for (const p of [[-w * 0.28, topY + h * 0.35], [-w * 0.05, topY + h * 0.55], [w * 0.12, topY + h * 0.62]] as const) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 1.8, 0, Math.PI * 2);
        ctx.fillStyle = COL.star;
        ctx.fill();
      }
      ctx.restore();

      // Hood
      ctx.beginPath();
      ctx.moveTo(-w * 0.2, topY + h * 0.2);
      ctx.quadraticCurveTo(-w * 0.16, topY - h * 0.06, w * 0.2, topY + h * 0.04);
      ctx.quadraticCurveTo(w * 0.34, topY + h * 0.18, w * 0.12, topY + h * 0.26);
      ctx.quadraticCurveTo(-w * 0.05, topY + h * 0.2, -w * 0.2, topY + h * 0.2);
      ctx.closePath();
      ctx.fillStyle = COL.cloakEdge;
      ctx.fill();

      // Face void
      ctx.beginPath();
      ctx.ellipse(w * 0.06, topY + h * 0.14, w * 0.15, h * 0.075, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#050309";
      ctx.fill();

      // Signature 2×3 glowing ring face
      const eyeColor = hit ? COL.danger : COL.glowBright;
      ctx.save();
      ctx.shadowColor = eyeColor;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = eyeColor;
      ctx.lineWidth = 1.4;
      const ex = w * 0.02, ey = topY + h * 0.105, gapX = w * 0.085, gapY = h * 0.035, rr = Math.max(1.5, w * 0.035);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
          ctx.beginPath();
          ctx.arc(ex + c * gapX, ey + r * gapY, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();

      // Boots peeking under the robe (simple running hint)
      const step = Math.sin(t2 * 14) * (onGround ? 5 : 0);
      ctx.fillStyle = "#08060f";
      ctx.fillRect(-w * 0.22 + step, footY - 8, w * 0.22, 9);
      ctx.fillRect(w * 0.02 - step, footY - 8, w * 0.22, 9);

      if (hit) {
        ctx.fillStyle = "rgba(220,38,38,0.25)";
        ctx.fillRect(-w * 0.6, topY - 6, w * 1.2, h + 12);
      }
      ctx.restore();
    };

    const drawObstacle = (o: O2, baseY: number) => {
      ctx.save();
      if (o.kind === "low") {
        // Glowing asteroid sitting on the ground
        const cx = o.x + o.w / 2, cy = baseY - o.h / 2;
        ctx.translate(cx, cy);
        ctx.shadowColor = COL.gold;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        const pts = 8;
        for (let i = 0; i < pts; i++) {
          const a = (i / pts) * Math.PI * 2;
          const rad = (o.w / 2) * (0.7 + 0.3 * Math.sin(o.seed + i * 2.1));
          const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, o.w / 2);
        g.addColorStop(0, "#3a2406");
        g.addColorStop(1, COL.gold);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = "#f6c453";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // High glitch barrier — duck under it
        const flick = 0.6 + 0.4 * Math.sin(o.seed + runT * 30);
        ctx.shadowColor = COL.glow;
        ctx.shadowBlur = 18;
        ctx.fillStyle = `rgba(124,58,237,${flick})`;
        ctx.fillRect(o.x, baseY - o.h - o.gapTop(), o.w, o.h);
        ctx.fillStyle = COL.glowBright;
        for (let i = 0; i < 5; i++) {
          const yy = baseY - o.h - o.gapTop() + Math.random() * o.h;
          ctx.fillRect(o.x - 3, yy, o.w + 6, 1.5);
        }
      }
      ctx.restore();
    };

    // Augment Obstacle with the high-bar floating gap (kept here so the
    // type stays simple above).
    // High bars float this far off the ground — set just above a ducking
    // player's head so ducking clears them but standing tall does not.
    const gapTopFor = (o: Obstacle) => (o.kind === "high" ? guardianH * 0.66 : 0);
    type O2 = Obstacle & { gapTop: () => number };
    const mkHighGap = (o: Obstacle): O2 => Object.assign(o, { gapTop: () => gapTopFor(o) });

    const spawn = () => {
      const high = Math.random() < 0.42 && dist > 600;
      const base: Obstacle = high
        ? { x: W + 40, kind: "high", w: 30 + Math.random() * 26, h: 34, seed: Math.random() * 10 }
        : { x: W + 40, kind: "low", w: 34 + Math.random() * 30, h: 30 + Math.random() * 26, seed: Math.random() * 10 };
      obstacles.push(mkHighGap(base));
    };

    const drawBackground = (tt: number) => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, COL.bg0);
      g.addColorStop(1, COL.bg1);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      for (const s of stars) {
        const sx = (s.x * W - dist * s.depth * 0.25) % W;
        const x = sx < 0 ? sx + W : sx;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(tt * 1.5 + s.tw));
        ctx.beginPath();
        ctx.arc(x, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(196,181,253,${tw * s.depth + 0.1})`;
        ctx.fill();
      }
      // Faint galaxy core low on the horizon
      const gg = ctx.createRadialGradient(W * 0.7, H * 0.95, 8, W * 0.7, H * 0.95, W * 0.5);
      gg.addColorStop(0, "rgba(124,58,237,0.12)");
      gg.addColorStop(1, "transparent");
      ctx.fillStyle = gg;
      ctx.fillRect(0, 0, W, H);

      // Ground line
      ctx.strokeStyle = "rgba(212,134,10,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    };

    const aabb = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) =>
      ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

    let crashed = false;
    let uiScore = -1;       // last score pushed to React (throttled)
    let uiScoreAt = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ph = phaseRef.current;

      drawBackground(runT);

      if (ph === "running") {
        runT += dt;
        speed = BASE_SPEED + Math.min(420, dist * 0.06);
        dist += speed * dt;

        // Physics
        vy -= GRAV * dt;
        py += vy * dt;
        if (py <= 0) { py = 0; vy = 0; onGround = true; }

        // Spawn
        spawnIn -= dt;
        if (spawnIn <= 0) {
          spawn();
          const gapSec = Math.max(0.7, 1.5 - dist * 0.00012) + Math.random() * 0.5;
          spawnIn = gapSec;
        }
        for (const o of obstacles) o.x -= speed * dt;
        obstacles = obstacles.filter((o) => o.x + o.w > -20);

        // Collision
        const gx = gxBase();
        const duckH = ducking ? guardianH * 0.6 : guardianH;
        const gBoxY = gy - py - duckH;
        const inset = 8;
        for (const o of obstacles as O2[]) {
          const oy = o.kind === "low" ? gy - o.h : gy - o.h - o.gapTop();
          if (aabb(gx - guardianW / 2 + inset, gBoxY + inset, guardianW - inset * 2, duckH - inset,
                   o.x + inset, oy, o.w - inset * 2, o.h)) {
            hitFlash = 1;
            crashed = true;
            const finalScore = Math.floor(dist / 10);
            setScoreUI(finalScore);
            void finishRun(finalScore);   // sets phase → "over" synchronously
            break;
          }
        }

        // HUD score — throttled to ~10/sec so we don't re-render every frame
        if (!crashed) {
          const sc = Math.floor(dist / 10);
          if (sc !== uiScore && now - uiScoreAt > 100) {
            uiScore = sc; uiScoreAt = now;
            setScoreUI(sc);
          }
        }
        crashed = false;
      }

      // Draw obstacles + guardian
      for (const o of obstacles as O2[]) drawObstacle(o, gy);
      drawGuardian(gxBase(), gy - py, ph === "running" ? runT : 0.0001, ducking, hitFlash > 0 && ph !== "running");

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // ── Input ──────────────────────────────────────────────────────────────
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        if (!e.repeat) jump();
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        setDuck(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown" || e.code === "KeyS") setDuck(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const lowerThird = e.clientY - rect.top > rect.height * 0.62;
      if (lowerThird && phaseRef.current === "running") setDuck(true);
      else jump();
    };
    const onPointerUp = () => setDuck(false);
    const onBlur = () => { if (phaseRef.current === "running") setPhaseBoth("paused"); };

    window.addEventListener("keydown", onKey, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("blur", onBlur);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("blur", onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Result line text
  let resultLine: string | null = null;
  if (resultMsg.startsWith("earned:")) {
    resultLine = `${t.guardian.earnedA} ${resultMsg.split(":")[1]} ${t.guardian.earnedB}`;
  } else if (resultMsg === "claimed") {
    resultLine = t.guardian.claimed;
  } else if (resultMsg === "missed") {
    resultLine = `${t.guardian.missedA} ${target} ${t.guardian.missedB}`;
  } else if (resultMsg === "loginReward") {
    resultLine = t.guardian.loginReward;
  }

  return (
    <div className="fixed inset-0 overflow-hidden select-none" style={{ backgroundColor: COL.bg0 }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: "none" }} />

      {/* Back to the site */}
      <Link href="/"
        className="absolute top-4 z-20 px-4 py-2 rounded-full text-sm font-bold"
        style={{
          [isAr ? "right" : "left"]: 16,
          backgroundColor: "#1e1530cc", color: COL.cream,
          border: "1px solid #2e2050", backdropFilter: "blur(4px)",
        } as React.CSSProperties}>
        {t.guardian.back}
      </Link>

      {/* HUD */}
      <div className="absolute top-4 z-20 flex gap-4 text-sm font-bold"
        style={{ [isAr ? "left" : "right"]: 16, color: COL.cream } as React.CSSProperties}>
        <span>{t.guardian.score}: {scoreUI}</span>
        <span style={{ color: COL.glowBright }}>{t.guardian.best}: {best}</span>
        <span style={{ color: COL.gold }}>{t.guardian.target}: {target}</span>
      </div>

      {/* Overlays */}
      {phase !== "running" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6"
          style={{ backgroundColor: "#0a0713aa", direction: isAr ? "rtl" : "ltr" }}>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-3"
            style={{ color: COL.cream, textShadow: `0 0 26px ${COL.glow}` }}>
            🛡️ {t.guardian.title}
          </h1>

          {phase === "ready" && (
            <>
              <p className="text-base md:text-lg mb-6 max-w-md" style={{ color: COL.cream, opacity: 0.8 }}>
                {t.guardian.tagline}
              </p>
              <p className="text-sm mb-1" style={{ color: COL.glowBright }}>{t.guardian.howJump}</p>
              <p className="text-sm mb-8" style={{ color: COL.glowBright }}>{t.guardian.howDuck}</p>
              <p className="text-lg font-bold animate-pulse" style={{ color: COL.gold }}>{t.guardian.start}</p>
            </>
          )}

          {phase === "paused" && (
            <p className="text-lg font-bold animate-pulse" style={{ color: COL.gold }}>{t.guardian.pausedHint}</p>
          )}

          {phase === "over" && (
            <>
              <p className="text-2xl font-extrabold mb-2" style={{ color: COL.cream }}>{t.guardian.gameOver}</p>
              <p className="text-xl mb-2" style={{ color: COL.glowBright }}>
                {t.guardian.score}: <strong>{scoreUI}</strong> · {t.guardian.best}: <strong>{best}</strong>
              </p>
              {resultLine && (
                <p className="text-base mb-6 px-5 py-2 rounded-full"
                  style={{
                    color: resultMsg.startsWith("earned:") ? COL.gold : COL.cream,
                    backgroundColor: "#1e1530", border: `1px solid ${resultMsg.startsWith("earned:") ? COL.gold : "#2e2050"}`,
                  }}>
                  {resultLine}
                </p>
              )}
              <button
                onClick={() => { phaseRef.current = "ready"; setPhase("ready"); }}
                className="px-8 py-3 rounded-full text-base font-bold mt-2 hover:opacity-90"
                style={{ backgroundColor: COL.gold, color: "#120d1f" }}>
                {t.guardian.playAgain}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
