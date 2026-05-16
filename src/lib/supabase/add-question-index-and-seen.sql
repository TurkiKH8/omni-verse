-- ============================================================
-- Omni-Verse: per-category question index + per-user "seen questions"
-- Run this entire file in: Supabase → SQL Editor → New query
--
-- Adds:
--  1) questions.q_index  — a friendly sequential number within each
--     category (Minecraft Q1..Q30, Science Q1.., etc.). Auto-assigned by
--     a trigger so the admin form, bulk upload, and SQL seed scripts all
--     get it right. Gaps are left when a question is deleted (no surprise
--     renumbering). Reassigned if a question is moved to another category.
--  2) public.user_seen_questions — which questions each player has been
--     shown, so the arena can prefer fresh questions and warn when a
--     category is running low for that player.
-- ============================================================

-- ── 1) q_index column ────────────────────────────────────────────────────────
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS q_index INTEGER;

CREATE OR REPLACE FUNCTION public.assign_question_index()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.q_index IS NULL THEN
      NEW.q_index := COALESCE(
        (SELECT MAX(q_index) FROM public.questions WHERE category_id = NEW.category_id), 0
      ) + 1;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    NEW.q_index := COALESCE(
      (SELECT MAX(q_index) FROM public.questions WHERE category_id = NEW.category_id), 0
    ) + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_question_index ON public.questions;
CREATE TRIGGER trg_assign_question_index
  BEFORE INSERT OR UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.assign_question_index();

-- Backfill existing rows: 1..N per category, ordered by creation.
WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY category_id ORDER BY created_at, id) AS rn
  FROM public.questions
)
UPDATE public.questions q
SET q_index = n.rn
FROM numbered n
WHERE q.id = n.id AND q.q_index IS NULL;

-- ── 2) user_seen_questions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_seen_questions (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_user_seen_questions_user ON public.user_seen_questions(user_id);

ALTER TABLE public.user_seen_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seen_select_own" ON public.user_seen_questions;
CREATE POLICY "seen_select_own" ON public.user_seen_questions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "seen_insert_own" ON public.user_seen_questions;
CREATE POLICY "seen_insert_own" ON public.user_seen_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "seen_update_own" ON public.user_seen_questions;
CREATE POLICY "seen_update_own" ON public.user_seen_questions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Verify:
--   SELECT category_id, count(*), min(q_index), max(q_index)
--   FROM public.questions GROUP BY category_id;
--   -> q_index should run 1..count per category, no NULLs.
