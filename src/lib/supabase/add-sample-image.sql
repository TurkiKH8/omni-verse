-- ============================================================
-- Omni-Verse: optional photo for a category's sample question
-- Run this entire file in: Supabase → SQL Editor → New query
--
-- ✅ SAFE — NON-DESTRUCTIVE. This only ADDS one new optional
-- column. No rows are deleted, nothing existing is changed.
-- Categories created before this migration simply have no
-- sample photo (the field stays empty until you add one).
--
-- Adds 1 new column to `categories`:
--   sample_image_url  (the photo shown next to the sample
--                       question in the "?" preview players see)
-- ============================================================

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS sample_image_url TEXT;

-- Tell Supabase's API layer to refresh so the new column is
-- visible immediately (avoids the "could not find column in
-- the schema cache" error).
NOTIFY pgrst, 'reload schema';
