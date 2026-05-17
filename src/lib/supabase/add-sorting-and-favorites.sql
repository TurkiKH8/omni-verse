-- ============================================================
-- Omni-Verse: category sorting groups + per-customer favorites
-- Run this entire file in: Supabase → SQL Editor → New query
--
-- ✅ SAFE — NON-DESTRUCTIVE. Only ADDS new things. No rows are
-- deleted, nothing existing is changed. Categories created
-- before this simply have no sorting group and no favorites
-- until customers add them.
--
-- Adds:
--   1) categories.sort_label_en / sort_label_ar  — an optional
--      grouping label (set in the admin "Add Category" form).
--      Categories sharing the same label become one filter chip
--      on the category-selection page.
--   2) public.user_favorite_categories  — which categories each
--      logged-in customer has hearted (favorited).
-- ============================================================

-- 1) Optional sorting-group label (both languages, or neither)
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS sort_label_en TEXT,
  ADD COLUMN IF NOT EXISTS sort_label_ar TEXT;

-- 2) Per-customer favorites table (mirrors user_seen_questions)
CREATE TABLE IF NOT EXISTS public.user_favorite_categories (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_user_fav_cat_user
  ON public.user_favorite_categories(user_id);

ALTER TABLE public.user_favorite_categories ENABLE ROW LEVEL SECURITY;

-- Each customer can only see / add / remove their OWN favorites.
DROP POLICY IF EXISTS "fav_select_own" ON public.user_favorite_categories;
CREATE POLICY "fav_select_own" ON public.user_favorite_categories
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fav_insert_own" ON public.user_favorite_categories;
CREATE POLICY "fav_insert_own" ON public.user_favorite_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fav_delete_own" ON public.user_favorite_categories;
CREATE POLICY "fav_delete_own" ON public.user_favorite_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Refresh Supabase's API layer so the new column/table are
-- visible immediately (avoids "schema cache" errors).
NOTIFY pgrst, 'reload schema';
