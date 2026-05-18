-- ============================================================
-- Omni-Verse: TV Link (phone ↔ TV pairing for the game board)
-- Run this entire file in: Supabase → SQL Editor → New query
--
-- ✅ SAFE — NON-DESTRUCTIVE. Adds ONE new table. Nothing
-- existing is deleted or changed.
--
-- A short-lived pairing record: the TV (omni-verse.shop/tv)
-- creates a row with a fresh random 4-digit code; the phone
-- "claims" that code to bind as the single controller. Codes
-- are single-use and expire, so they're safe even though short.
-- All writes go through the service-role server routes
-- (/api/tv/create, /api/tv/claim) — never the browser directly.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tv_sessions (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code               CHAR(4) NOT NULL,
  phase              TEXT NOT NULL DEFAULT 'waiting'
                       CHECK (phase IN ('waiting', 'linked', 'ended')),
  controller_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  state              JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at         TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

-- Only ONE active (not-yet-expired) row may hold a given code at a
-- time, so codes never clash while still being reusable later.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tv_sessions_active_code
  ON public.tv_sessions (code)
  WHERE phase <> 'ended';

CREATE INDEX IF NOT EXISTS idx_tv_sessions_expires
  ON public.tv_sessions (expires_at);

ALTER TABLE public.tv_sessions ENABLE ROW LEVEL SECURITY;

-- The TV polls its own row by id, and the controller reads the row
-- it is bound to; reads are harmless (no secrets stored). Writes are
-- performed only by the service-role server routes, so there is no
-- INSERT/UPDATE policy for normal users.
DROP POLICY IF EXISTS "tv_sessions_select_public" ON public.tv_sessions;
CREATE POLICY "tv_sessions_select_public"
  ON public.tv_sessions FOR SELECT USING (true);

-- Refresh Supabase's API layer so the new table is visible
-- immediately (avoids "schema cache" errors).
NOTIFY pgrst, 'reload schema';
