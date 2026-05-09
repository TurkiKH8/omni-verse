import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(url && key);

// No-op lock prevents the orphaned navigator.locks deadlock that causes
// signInWithPassword / getSession to hang forever under React 19 + Next 16
// Strict Mode (supabase-js issues #2111, #2013).
const noOpLock = async <R>(_name: string, _timeout: number, fn: () => Promise<R>) => fn();

export const supabase = createClient(url, key, {
  auth: { lock: noOpLock },
});
