"use client";

/**
 * "Connect to TV" — the phone side of the TV link.
 *
 * Fully self-contained on purpose: it looks up the signed-in user
 * itself and owns its own popup state, so wiring it into the game
 * board is a SINGLE line and nothing in the large ArenaGame file is
 * restructured (no prop plumbing, no risk to working code).
 *
 * The button is hidden on desktop (md:hidden) — it is only meant for
 * a phone, and the game board is the only place it is rendered.
 */

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";

type UI = "closed" | "form" | "linking" | "linked";

export default function ConnectToTv() {
  const { t } = useLanguage();
  const [ui, setUi] = useState<UI>("closed");
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [err, setErr] = useState("");
  const inputs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);

  const reset = () => {
    setDigits(["", "", "", ""]);
    setErr("");
  };

  const setDigit = (i: number, v: string) => {
    const c = v.replace(/\D/g, "").slice(-1); // keep only the last typed digit
    setDigits((prev) => {
      const next = [...prev];
      next[i] = c;
      return next;
    });
    if (c && i < 3) inputs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (text.length) {
      e.preventDefault();
      const next = ["", "", "", ""];
      for (let i = 0; i < text.length; i++) next[i] = text[i];
      setDigits(next);
      inputs.current[Math.min(text.length, 3)]?.focus();
    }
  };

  const submit = async () => {
    const code = digits.join("");
    if (code.length !== 4) {
      setErr(t.arena.tvBadCode);
      return;
    }
    setErr("");
    setUi("linking");

    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) {
      setErr(t.arena.tvBadCode);
      setUi("form");
      return;
    }

    try {
      const res = await fetch("/api/tv/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, userId }),
      });
      if (res.ok) {
        setUi("linked");
        return;
      }
      setErr(t.arena.tvBadCode);
      setUi("form");
    } catch {
      setErr(t.arena.tvBadCode);
      setUi("form");
    }
  };

  return (
    <>
      {/* Mobile-only trigger, sits in the game-board header */}
      <button
        onClick={() => {
          reset();
          setUi("form");
        }}
        className="md:hidden shrink-0 px-3 py-1.5 rounded-full text-xs font-bold"
        style={{ backgroundColor: "#d4860a22", border: "1px solid #d4860a", color: "#d4860a" }}
      >
        {t.arena.tvConnect}
      </button>

      {ui !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5"
          style={{ backgroundColor: "#0a0713dd" }}
          onClick={() => setUi("closed")}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
            style={{ backgroundColor: "#160f28", border: "1px solid #2e2050" }}
            onClick={(e) => e.stopPropagation()}
          >
            {ui === "linked" ? (
              <>
                <h3 className="text-xl font-extrabold text-center" style={{ color: "#4ade80" }}>
                  {t.arena.tvLinkedTitle}
                </h3>
                <p className="text-sm text-center" style={{ color: "#e8d5a0", opacity: 0.7 }}>
                  {t.arena.tvLinkedBody}
                </p>
                <button
                  onClick={() => setUi("closed")}
                  className="px-6 py-3 rounded-full text-sm font-bold"
                  style={{ backgroundColor: "#d4860a", color: "#120d1f" }}
                >
                  {t.arena.tvClose}
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-extrabold text-center" style={{ color: "#e8d5a0" }}>
                  {t.arena.tvTitle}
                </h3>

                <div className="flex flex-col gap-1.5">
                  <p className="text-sm" style={{ color: "#e8d5a0", opacity: 0.75 }}>
                    {t.arena.tvStep1}
                  </p>
                  <p
                    className="text-center text-base font-bold rounded-xl py-2"
                    style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#d4860a" }}
                  >
                    omni-verse.shop/tv
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-sm" style={{ color: "#e8d5a0", opacity: 0.75 }}>
                    {t.arena.tvStep2}
                  </p>
                  <div className="flex justify-center gap-3" dir="ltr">
                    {digits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          inputs.current[i] = el;
                        }}
                        value={d}
                        onChange={(e) => setDigit(i, e.target.value)}
                        onKeyDown={(e) => onKeyDown(i, e)}
                        onPaste={onPaste}
                        inputMode="numeric"
                        type="tel"
                        maxLength={1}
                        aria-label={`Digit ${i + 1}`}
                        className="w-14 h-16 text-center text-2xl font-extrabold rounded-xl outline-none"
                        style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
                      />
                    ))}
                  </div>
                </div>

                {err && (
                  <p className="text-sm text-center" style={{ color: "#fca5a5" }}>
                    {err}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setUi("closed")}
                    className="flex-1 px-4 py-3 rounded-full text-sm font-bold"
                    style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0" }}
                  >
                    {t.arena.tvClose}
                  </button>
                  <button
                    onClick={submit}
                    disabled={ui === "linking"}
                    className="flex-1 px-4 py-3 rounded-full text-sm font-bold"
                    style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: ui === "linking" ? 0.5 : 1 }}
                  >
                    {ui === "linking" ? t.arena.tvLinking : t.arena.tvLink}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
