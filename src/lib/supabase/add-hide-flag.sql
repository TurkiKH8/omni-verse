-- ════════════════════════════════════════════════════════════════════════════
--  Hide flag for categories and questions
--  Run this ONCE in your Supabase SQL Editor (Dashboard → SQL → New Query).
--  After running, the admin "Hide" / "Show" buttons in Categories and
--  Questions actually work — without this column they were silently failing
--  because PostgREST returned 400 "column ... is_hidden does not exist".
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.questions  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

-- Verify with:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name IN ('categories','questions') AND column_name = 'is_hidden';
