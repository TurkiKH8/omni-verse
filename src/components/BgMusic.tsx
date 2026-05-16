"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export default function BgMusic() {
  const pathname  = usePathname();
  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [volume,  setVolume]  = useState(60);
  const [url,     setUrl]     = useState("");
  const [playing, setPlaying] = useState(false);
  const [ready,   setReady]   = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["music_enabled", "music_volume", "music_url"])
      .then(({ data }) => {
        if (!data) return;
        const map = Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value]));
        setEnabled(map.music_enabled === "true");
        setVolume(parseInt(map.music_volume ?? "60"));
        setUrl(map.music_url ?? "");
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (!ready || !enabled || !url) return;
    const audio = new Audio(url);
    audio.loop   = true;
    audio.volume = volume / 100;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [ready, enabled, url, volume]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  // Hide on arena (arena manages its own music)
  if (pathname?.startsWith("/arena")) return null;

  // Hide if music not configured
  if (!ready || !enabled || !url) return null;

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  return (
    <button
      onClick={toggle}
      title={playing ? "Pause music" : "Play music"}
      className="fixed bottom-5 right-5 z-40 w-10 h-10 rounded-full flex items-center justify-center text-base transition-opacity hover:opacity-100"
      style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0", opacity: 0.75 }}
    >
      {playing ? "🔊" : "🎵"}
    </button>
  );
}
