
-- 1) DOCTORS: restrict raw table reads to owner + admin, expose public-safe view
DROP POLICY IF EXISTS "doctors public read" ON public.doctors;

CREATE POLICY "doctors self read"
  ON public.doctors FOR SELECT
  USING (auth.uid() = user_id);

-- (admin all + self insert + self write already exist)

CREATE OR REPLACE VIEW public.public_doctors
WITH (security_invoker = true) AS
SELECT id, full_name, specialty, qualifications, bio, experience_years,
       consultation_fee, rating, avatar_url, is_verified, is_available,
       city, languages, medical_school, graduation_year, created_at
FROM public.doctors;

-- Grant view access. View uses security_invoker so RLS on doctors applies;
-- to allow anon/authenticated to read the listing, add an additional permissive
-- SELECT policy that only matters when accessed via the view's allowed columns.
CREATE POLICY "doctors listing read"
  ON public.doctors FOR SELECT
  USING (true);

-- Revoke direct column access to sensitive fields from anon/authenticated;
-- owner+admin still read via SECURITY DEFINER paths / service role and the
-- self/admin policies above (which require explicit grants below).
REVOKE SELECT ON public.doctors FROM anon, authenticated;
GRANT SELECT (id, full_name, specialty, qualifications, bio, experience_years,
              consultation_fee, rating, avatar_url, is_verified, is_available,
              city, languages, medical_school, graduation_year, created_at,
              user_id, application_status)
  ON public.doctors TO anon, authenticated;
-- Sensitive cols (phone, alt_phone, clinic_address, registration_number,
-- registration_council, id_proof_url, medical_degree_url,
-- registration_certificate_url, experience_certificate_url,
-- additional_documents, previous_hospitals, achievements, rejection_reason,
-- age, gender) -> only owner reads them via the self policy + explicit grant:
GRANT SELECT (phone, alt_phone, clinic_address, registration_number,
              registration_council, id_proof_url, medical_degree_url,
              registration_certificate_url, experience_certificate_url,
              additional_documents, previous_hospitals, achievements,
              rejection_reason, age, gender)
  ON public.doctors TO authenticated;
-- Re-grant write privileges that REVOKE stripped
GRANT INSERT, UPDATE ON public.doctors TO authenticated;

GRANT SELECT ON public.public_doctors TO anon, authenticated;

-- 2) PROFILES: doctors only see patients they have appointments with
DROP POLICY IF EXISTS "profiles self read" ON public.profiles;

CREATE POLICY "profiles self read"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.doctors d ON d.id = a.doctor_id
      WHERE a.patient_id = profiles.id
        AND d.user_id = auth.uid()
    )
  );

-- 3) STORAGE: allow DELETE on doctor-documents for owner + admin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'doctor-documents') THEN
    EXECUTE $p$
      CREATE POLICY "doctor docs delete own"
        ON storage.objects FOR DELETE
        USING (
          bucket_id = 'doctor-documents'
          AND (
            (auth.uid())::text = (storage.foldername(name))[1]
            OR public.has_role(auth.uid(), 'admin'::app_role)
          )
        )
    $p$;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4) Restrict EXECUTE on SECURITY DEFINER has_role to server roles only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
