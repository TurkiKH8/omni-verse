-- ============================================================
-- Omni-Verse: central list of category "sorts" (groups)
-- Run this entire file in: Supabase → SQL Editor → New query
--
-- ✅ SAFE — NON-DESTRUCTIVE. Only ADDS a new table. Nothing
-- existing is deleted or changed.
--
-- This is the single source of truth for sorting-group names,
-- managed from the "Add a Sort" button on the admin Categories
-- page. The Add/Edit Category form picks a sort from this list
-- via a dropdown (so names can't be misspelled or duplicated).
-- The chosen name is also copied onto the category row
-- (sort_label_en / sort_label_ar) so the player page keeps
-- working with no further changes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.category_sorts (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_en    TEXT NOT NULL,
  name_ar    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.category_sorts ENABLE ROW LEVEL SECURITY;

-- Anyone may read the list (the admin dropdown needs it).
DROP POLICY IF EXISTS "sorts_select_public" ON public.category_sorts;
CREATE POLICY "sorts_select_public"
  ON public.category_sorts FOR SELECT USING (true);

-- Only admins may add / remove sorts (mirrors categories).
DROP POLICY IF EXISTS "sorts_write_admin" ON public.category_sorts;
CREATE POLICY "sorts_write_admin"
  ON public.category_sorts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Refresh Supabase's API layer so the new table is visible
-- immediately (avoids "schema cache" errors).
NOTIFY pgrst, 'reload schema';
