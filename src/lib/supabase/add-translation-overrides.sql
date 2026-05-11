-- ============================================================
-- Omni-Verse: Editable site copy (translation overrides)
-- Run this entire file in: Supabase → SQL Editor → New query
--
-- Stores per-key, per-language overrides for any string defined in
-- src/lib/i18n.ts. The runtime shows the override if present, otherwise
-- the default from i18n.ts. Reads are public so the front-end can show
-- edited copy. Writes are restricted to Master Omni rank only.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.translation_overrides (
  key        TEXT NOT NULL,                             -- e.g. "nav.home" or "about.howSteps.0"
  lang       TEXT NOT NULL CHECK (lang IN ('en', 'ar')),
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (key, lang)
);

ALTER TABLE public.translation_overrides ENABLE ROW LEVEL SECURITY;

-- Public reads — every visitor needs to see edited copy on the front site.
DROP POLICY IF EXISTS "translation_select_public" ON public.translation_overrides;
CREATE POLICY "translation_select_public"
  ON public.translation_overrides FOR SELECT USING (true);

-- Writes restricted to Master Omni (and full site admins as a safety net).
DROP POLICY IF EXISTS "translation_write_master" ON public.translation_overrides;
CREATE POLICY "translation_write_master"
  ON public.translation_overrides FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND (rank = 'Master Omni' OR is_admin = true))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND (rank = 'Master Omni' OR is_admin = true))
  );

CREATE INDEX IF NOT EXISTS idx_translation_overrides_lang
  ON public.translation_overrides(lang);
