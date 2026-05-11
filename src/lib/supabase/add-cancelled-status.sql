-- ============================================================
-- Omni-Verse: Allow 'cancelled' status on sessions
-- Run this entire file in: Supabase → SQL Editor → New query
--
-- The original sessions.status CHECK constraint only allowed
--   ('active', 'completed', 'expired')
-- This migration drops that constraint and re-creates it with a
-- fourth value: 'cancelled' (for games the user voluntarily ended
-- via the Cancel button on the History page). Coins spent on a
-- cancelled game are NOT refunded.
-- ============================================================

-- Drop any check constraint that references the status column,
-- regardless of its auto-generated name.
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN
    SELECT conname
    FROM   pg_constraint
    WHERE  conrelid = 'public.sessions'::regclass
      AND  contype  = 'c'
      AND  pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.sessions DROP CONSTRAINT %I', rec.conname);
  END LOOP;
END $$;

-- Re-add the constraint with the 'cancelled' option included.
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('active', 'completed', 'expired', 'cancelled'));
