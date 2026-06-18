
CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.doctor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  appointment_id uuid,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, patient_id)
);

CREATE INDEX idx_doctor_reviews_doctor ON public.doctor_reviews(doctor_id, created_at DESC);

ALTER TABLE public.doctor_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews public read" ON public.doctor_reviews FOR SELECT USING (true);

CREATE POLICY "reviews patient insert" ON public.doctor_reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = patient_id AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.patient_id = auth.uid() AND a.doctor_id = doctor_reviews.doctor_id
        AND a.status IN ('completed','confirmed')
    )
  );

CREATE POLICY "reviews patient update" ON public.doctor_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "reviews patient delete" ON public.doctor_reviews FOR DELETE TO authenticated
  USING (auth.uid() = patient_id);

CREATE TRIGGER trg_doctor_reviews_updated_at BEFORE UPDATE ON public.doctor_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

GRANT SELECT ON public.doctor_reviews TO anon, authenticated;
