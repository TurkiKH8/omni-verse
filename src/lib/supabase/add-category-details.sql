-- ============================================================
-- Omni-Verse: Category descriptions + sample question/answer
-- Run this entire file in: Supabase → SQL Editor → New query
--
-- ⚠️  DESTRUCTIVE — READ BEFORE RUNNING  ⚠️
-- This migration DELETES every existing category and every existing
-- question (and, because of foreign-key cascades, every row in the
-- `purchases` table). You asked for this so the new required fields
-- can't be left blank on legacy rows — you'll rebuild categories &
-- questions one by one from the admin panel afterwards.
--
-- Adds 6 new columns to `categories`, all required (the admin form
-- enforces non-empty values; the DB default of '' just keeps the
-- ALTER itself safe):
--   description_en, description_ar
--   sample_question_en, sample_answer_en
--   sample_question_ar, sample_answer_ar
-- ============================================================

-- 1) Wipe questions + categories. Deleting categories cascades to
--    questions and purchases via their ON DELETE CASCADE FKs, but we
--    delete questions first so the question_count trigger has nothing
--    odd to do.
DELETE FROM public.questions;
DELETE FROM public.categories;

-- 2) Add the new columns. TEXT NOT NULL DEFAULT '' so the ALTER works
--    regardless of table contents; the admin UI requires real values.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS description_en      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description_ar      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sample_question_en  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sample_answer_en    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sample_question_ar  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sample_answer_ar    TEXT NOT NULL DEFAULT '';

-- 3) Sanity: confirm the table is empty and the columns exist.
--    (SELECT count(*) FROM public.categories;  -> should be 0)
