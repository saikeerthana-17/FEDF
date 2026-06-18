
-- Add real-world doctor application fields
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS alt_phone text,
  ADD COLUMN IF NOT EXISTS clinic_address text,
  ADD COLUMN IF NOT EXISTS languages text,
  ADD COLUMN IF NOT EXISTS medical_school text,
  ADD COLUMN IF NOT EXISTS graduation_year integer,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS registration_council text,
  ADD COLUMN IF NOT EXISTS previous_hospitals text,
  ADD COLUMN IF NOT EXISTS achievements text,
  ADD COLUMN IF NOT EXISTS id_proof_url text,
  ADD COLUMN IF NOT EXISTS medical_degree_url text,
  ADD COLUMN IF NOT EXISTS registration_certificate_url text,
  ADD COLUMN IF NOT EXISTS experience_certificate_url text,
  ADD COLUMN IF NOT EXISTS additional_documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS application_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Storage bucket for doctor documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('doctor-documents', 'doctor-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for doctor documents bucket
CREATE POLICY "Doctors upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'doctor-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Doctors read own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'doctor-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Doctors update own documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'doctor-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
