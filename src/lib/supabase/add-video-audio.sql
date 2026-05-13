-- ════════════════════════════════════════════════════════════════════════════
--  Video + audio support for questions (alongside the existing image support)
--  Run this ONCE in your Supabase SQL Editor (Dashboard → SQL → New Query).
--  After running, the admin "Add Question" form will be able to upload short
--  videos (mp4 / webm, up to 100 MB) and audio clips (mp3 / wav / m4a / ogg /
--  aac, up to 20 MB).
-- ════════════════════════════════════════════════════════════════════════════

-- 1. New nullable columns on questions
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- 2. Public "videos" storage bucket (100 MB cap, mp4 / webm)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  104857600,
  ARRAY['video/mp4','video/webm','video/quicktime']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Public "audio" storage bucket (20 MB cap, common formats)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio',
  'audio',
  true,
  20971520,
  ARRAY['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/mp4','audio/x-m4a','audio/ogg','audio/aac']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 4. RLS policies on storage.objects so:
--    - anyone can READ from videos + audio (arena needs to render them)
--    - any authenticated user can UPLOAD / UPDATE / DELETE inside them
--    - service-role bypasses RLS anyway (used by /api/* routes)

DROP POLICY IF EXISTS "videos_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "videos_authed_insert" ON storage.objects;
DROP POLICY IF EXISTS "videos_authed_update" ON storage.objects;
DROP POLICY IF EXISTS "videos_authed_delete" ON storage.objects;

CREATE POLICY "videos_public_read"   ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');
CREATE POLICY "videos_authed_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'videos');
CREATE POLICY "videos_authed_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'videos') WITH CHECK (bucket_id = 'videos');
CREATE POLICY "videos_authed_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'videos');

DROP POLICY IF EXISTS "audio_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "audio_authed_insert" ON storage.objects;
DROP POLICY IF EXISTS "audio_authed_update" ON storage.objects;
DROP POLICY IF EXISTS "audio_authed_delete" ON storage.objects;

CREATE POLICY "audio_public_read"   ON storage.objects FOR SELECT
  USING (bucket_id = 'audio');
CREATE POLICY "audio_authed_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'audio');
CREATE POLICY "audio_authed_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'audio') WITH CHECK (bucket_id = 'audio');
CREATE POLICY "audio_authed_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'audio');

-- Done. Verify with:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'questions' AND column_name IN ('video_url','audio_url');
--   SELECT id, public, file_size_limit FROM storage.buckets WHERE id IN ('videos','audio');
