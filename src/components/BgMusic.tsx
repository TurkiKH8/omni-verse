"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export default function BgMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled,  setEnabled]  = useState(false);
  const [volume,   setVolume]   = useState(60);
  const [url,      setUrl]      = useState("");
  const [playing,  setPlaying]  = useState(false);
  const [ready,    setReady]    = useState(false);

  // Load settings from DB
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["music_enabled", "music_volume", "music_url"])
      .then(({ data }) => {
        if (!data) return;
        const map = Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value]));
        const isEnabled = map.music_enabled === "true";
        const vol       = parseInt(map.music_volume ?? "60");
        const src       = map.music_url ?? "";
        setEnabled(isEnabled);
        setVolume(vol);
        setUrl(src);
        setReady(true);
      });
  }, []);

  // Create / update audio element when settings load
  useEffect(() => {
    if (!ready || !enabled || !url) return;

    const audio = new Audio(url);
    audio.loop   = true;
    audio.volume = volume / 100;
    audioRef.current = audio;

    // Browsers block autoplay — start on first user interaction
    const start = () => {
      audio.play().then(() => setPlaying(true)).catch(() => {});
      window.removeEventListener("click", start);
      window.removeEventListener("keydown", start);
    };
    window.addEventListener("click",   start);
    window.addEventListener("keydown", start);

    return () => {
      window.removeEventListener("click",   start);
      window.removeEventListener("keydown", start);
      audio.pause();
    };
  }, [ready, enabled, url, volume]);

  // Keep volume in sync if it changes
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  // Nothing visible — music runs silently in the background
  // Show a small mute/unmute button only while playing
  if (!enabled || !url || !playing) return null;

  return (
    <button
      onClick={() => {
        if (!audioRef.current) return;
        if (playing) { audioRef.current.pause(); setPlaying(false); }
        else         { audioRef.current.play();  setPlaying(true);  }
      }}
      title={playing ? "Mute music" : "Play music"}
      className="fixed bottom-5 right-5 z-40 w-10 h-10 rounded-full flex items-center justify-center text-base transition-opacity hover:opacity-100"
      style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0", opacity: 0.6 }}
    >
      {playing ? "🔊" : "🔇"}
    </button>
  );
}
