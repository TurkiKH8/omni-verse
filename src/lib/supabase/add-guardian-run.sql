-- ============================================================
-- Omni-Verse: Omni Guardian Run mini-game
-- Run this entire file in: Supabase → SQL Editor → New query
--
-- ✅ SAFE — NON-DESTRUCTIVE. Only ADDS one column + three new
-- tables and seeds a single config row. Nothing existing is
-- deleted or changed.
--
-- Adds:
--   1) profiles.guardian_best        — each player's best score
--   2) guardian_config (1 row)       — the admin-set daily target
--   3) guardian_target_log           — history of target changes
--   4) guardian_claims               — once-per-day reward record
--      (written ONLY by the secure server route, never the client)
-- ============================================================

-- 1) Personal best (display only; reward is gated by the target)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS guardian_best INTEGER NOT NULL DEFAULT 0;

-- 2) Single-row config: today's score to beat
CREATE TABLE IF NOT EXISTS public.guardian_config (
  id           SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  daily_target INTEGER NOT NULL DEFAULT 100,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   TEXT
);
INSERT INTO public.guardian_config (id, daily_target)
  VALUES (1, 100) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.guardian_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "guardian_config_select_public" ON public.guardian_config;
CREATE POLICY "guardian_config_select_public"
  ON public.guardian_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "guardian_config_write_admin" ON public.guardian_config;
CREATE POLICY "guardian_config_write_admin"
  ON public.guardian_config FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- 3) History of every target change (so you can track the trend)
CREATE TABLE IF NOT EXISTS public.guardian_target_log (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target     INTEGER NOT NULL,
  changed_by TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.guardian_target_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "guardian_log_admin" ON public.guardian_target_log;
CREATE POLICY "guardian_log_admin"
  ON public.guardian_target_log FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- 4) Once-per-day reward record. Users may READ their own rows so
--    the page knows "already claimed today", but there is NO insert
--    policy — only the service-role server route can write here, so
--    the daily cap can't be tampered with from the browser.
CREATE TABLE IF NOT EXISTS public.guardian_claims (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_date DATE NOT NULL,
  coins      INTEGER NOT NULL,
  score      INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, claim_date)
);
ALTER TABLE public.guardian_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "guardian_claims_select_own" ON public.guardian_claims;
CREATE POLICY "guardian_claims_select_own"
  ON public.guardian_claims FOR SELECT USING (auth.uid() = user_id);

-- Refresh Supabase's API layer so the new column/tables are
-- visible immediately (avoids "schema cache" errors).
NOTIFY pgrst, 'reload schema';
