
-- 1) Allow the public_doctors view to bypass RLS on the underlying doctors table
--    since it only exposes safe public columns.
ALTER VIEW public.public_doctors SET (security_invoker = false);
GRANT SELECT ON public.public_doctors TO anon, authenticated;

-- 2) Public bucket for doctor profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('doctor-avatars', 'doctor-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3) Storage policies for the new bucket
DROP POLICY IF EXISTS "Doctor avatars are public" ON storage.objects;
CREATE POLICY "Doctor avatars are public"
ON storage.objects FOR SELECT
USING (bucket_id = 'doctor-avatars');

DROP POLICY IF EXISTS "Doctors upload own avatar" ON storage.objects;
CREATE POLICY "Doctors upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'doctor-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Doctors update own avatar" ON storage.objects;
CREATE POLICY "Doctors update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'doctor-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Doctors delete own avatar" ON storage.objects;
CREATE POLICY "Doctors delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'doctor-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
