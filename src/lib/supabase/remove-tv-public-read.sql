-- ============================================================
-- Omni-Verse: lock down tv_sessions (security hardening)
-- Run this entire file in: Supabase → SQL Editor → New query
--
-- ✅ SAFE — NON-DESTRUCTIVE. It only REMOVES a too-open read
-- rule. No data is deleted and nothing stops working:
--   • The phone never read this table directly (it uses the
--     /api/tv/* server routes).
--   • The TV now reads its session through the new service-role
--     route /api/tv/state instead of the public key.
--   • The server routes use the service-role key, which bypasses
--     RLS, so creating / claiming / syncing keeps working.
--
-- BEFORE this change, the public read policy let anyone with the
-- public key run `select * from tv_sessions` and dump EVERY live
-- game's questions AND answers. This removes that.
-- ============================================================

-- Drop the world-readable SELECT policy. RLS stays ENABLED on the
-- table; with no anon policies left, the public key can no longer
-- read tv_sessions at all (service-role routes are unaffected).
DROP POLICY IF EXISTS "tv_sessions_select_public" ON public.tv_sessions;

-- Make sure row-level security is still on (it was, but be explicit).
ALTER TABLE public.tv_sessions ENABLE ROW LEVEL SECURITY;

-- Refresh Supabase's API layer.
NOTIFY pgrst, 'reload schema';
