-- ════════════════════════════════════════════════════════════════════════════
--  Image support for questions and categories
--  Run this ONCE in your Supabase SQL Editor (Dashboard → SQL → New Query).
--  After running, the admin "Add Question" / "Add Category" forms will be
--  able to upload PNG/JPEG/JPG covers via the /images storage bucket.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Add image_url column to both tables (nullable, no default)
ALTER TABLE public.questions  ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Public storage bucket for images (10 MB cap, only PNG/JPEG/JPG)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public            = EXCLUDED.public,
      file_size_limit   = EXCLUDED.file_size_limit,
      allowed_mime_types= EXCLUDED.allowed_mime_types;

-- 3. RLS policies on storage.objects so:
--    - anyone can READ images (so the public arena can render covers)
--    - any authenticated user can UPLOAD / UPDATE / DELETE inside the bucket
--      (admin pages already gate access; service-role bypasses RLS anyway)

-- Drop existing identically-named policies so this script is idempotent
DROP POLICY IF EXISTS "images_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "images_authed_insert" ON storage.objects;
DROP POLICY IF EXISTS "images_authed_update" ON storage.objects;
DROP POLICY IF EXISTS "images_authed_delete" ON storage.objects;

CREATE POLICY "images_public_read"   ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

CREATE POLICY "images_authed_insert" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');

CREATE POLICY "images_authed_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'images')
  WITH CHECK (bucket_id = 'images');

CREATE POLICY "images_authed_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'images');

-- Done. Verify with:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name IN ('questions','categories') AND column_name = 'image_url';
--   SELECT * FROM storage.buckets WHERE id = 'images';
