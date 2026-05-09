// Helpers that prevent the Supabase JS client from leaving UI in a stuck state
// when a query / auth call hangs (Web Locks deadlock, slow network, etc.)

export function raceWithTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)),
  ]);
}

// Reads the user's session straight out of localStorage and decodes the JWT.
// Used as a fallback whenever supabase.auth.getSession() / getUser() hangs.
export function decodeSessionFromStorage(): { id: string; email?: string } | null {
  try {
    const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(/https?:\/\/([^.]+)\./)?.[1];
    if (!projectRef || typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { access_token?: string };
    const parts = parsed.access_token?.split(".");
    if (!parts || parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1])) as { sub?: string; email?: string; exp?: number };
    if (!payload.sub) return null;
    if (payload.exp && payload.exp * 1000 <= Date.now()) return null;
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
