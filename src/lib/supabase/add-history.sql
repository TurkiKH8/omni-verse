-- ============================================================
-- Omni-Verse: Game History + Active Game Persistence  v1.0
-- Run this entire file in: Supabase → SQL Editor → New query
--
-- What this adds:
--   • Persist full game state (board, teams, scores) per session
--   • Distinguish active vs completed vs expired games
--   • 24-hour auto-expiry timestamp on each active game
--   • RLS UPDATE policy so users can save progress on their own games
-- ============================================================

-- 1) New columns on sessions
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'expired')),
  ADD COLUMN IF NOT EXISTS board_state       JSONB,
  ADD COLUMN IF NOT EXISTS teams_state       JSONB,
  ADD COLUMN IF NOT EXISTS solo_score        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_step      TEXT,
  ADD COLUMN IF NOT EXISTS questions_per_cat INTEGER DEFAULT 6,
  ADD COLUMN IF NOT EXISTS expires_at        TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  ADD COLUMN IF NOT EXISTS last_active_at    TIMESTAMPTZ DEFAULT now();

-- 2) Existing rows: anything with a completed_at gets 'completed',
--    everything else (legacy) is 'expired' so it doesn't clutter Active.
UPDATE public.sessions
SET status = CASE
  WHEN completed_at IS NOT NULL THEN 'completed'
  ELSE 'expired'
END
WHERE status IS NULL;

-- 3) Index for the history page query
CREATE INDEX IF NOT EXISTS idx_sessions_user_status_active
  ON public.sessions(user_id, status, last_active_at DESC);

-- 4) RLS UPDATE policy — needed so users can save progress mid-game.
--    The existing schema only allowed SELECT and INSERT on their own rows.
DROP POLICY IF EXISTS "sess_update_own" ON public.sessions;
CREATE POLICY "sess_update_own"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5) Optional: backfill teams_state from the existing teams table for
--    legacy completed sessions so they still show team scores on History.
UPDATE public.sessions s
SET teams_state = COALESCE((
  SELECT jsonb_agg(jsonb_build_object('id', t.rank, 'name', t.name, 'score', t.score) ORDER BY t.rank)
  FROM public.teams t
  WHERE t.session_id = s.id
), '[]'::jsonb)
WHERE s.teams_state IS NULL AND s.game_mode = 'team' AND s.status = 'completed';
