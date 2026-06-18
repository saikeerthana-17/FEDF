
-- Weekly availability per doctor
CREATE TABLE public.doctor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_minutes integer NOT NULL DEFAULT 30 CHECK (slot_minutes BETWEEN 5 AND 180),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, day_of_week)
);

ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "avail public read"
  ON public.doctor_availability FOR SELECT
  USING (true);

CREATE POLICY "avail doctor write"
  ON public.doctor_availability FOR ALL
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_availability.doctor_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_availability.doctor_id AND d.user_id = auth.uid()));

-- Days off
CREATE TABLE public.doctor_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  leave_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, leave_date)
);

ALTER TABLE public.doctor_leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leaves public read"
  ON public.doctor_leaves FOR SELECT USING (true);

CREATE POLICY "leaves doctor write"
  ON public.doctor_leaves FOR ALL
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_leaves.doctor_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_leaves.doctor_id AND d.user_id = auth.uid()));

-- Prescription templates
CREATE TABLE public.prescription_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_user_id uuid NOT NULL,
  name text NOT NULL,
  diagnosis text,
  medicines jsonb NOT NULL DEFAULT '[]'::jsonb,
  advice text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prescription_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tpl self all"
  ON public.prescription_templates FOR ALL
  USING (auth.uid() = doctor_user_id)
  WITH CHECK (auth.uid() = doctor_user_id);

-- Vitals
CREATE TABLE public.vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  doctor_id uuid,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  bp_systolic integer,
  bp_diastolic integer,
  heart_rate integer,
  temperature_c numeric(4,1),
  spo2 integer,
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  notes text
);

ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vitals read"
  ON public.vitals FOR SELECT
  USING (
    auth.uid() = patient_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = vitals.doctor_id AND d.user_id = auth.uid())
  );

CREATE POLICY "vitals doctor write"
  ON public.vitals FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = vitals.doctor_id AND d.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "vitals doctor update"
  ON public.vitals FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = vitals.doctor_id AND d.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
