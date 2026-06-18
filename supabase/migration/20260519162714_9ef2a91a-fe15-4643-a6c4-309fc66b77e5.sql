
-- Profile editing fields + location
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS chronic_conditions text,
  ADD COLUMN IF NOT EXISTS last_lat double precision,
  ADD COLUMN IF NOT EXISTS last_lng double precision,
  ADD COLUMN IF NOT EXISTS last_location_accuracy double precision,
  ADD COLUMN IF NOT EXISTS last_location_at timestamptz,
  ADD COLUMN IF NOT EXISTS location_consent boolean NOT NULL DEFAULT false;

-- Emergency requests (SOS)
CREATE TABLE IF NOT EXISTS public.emergency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('ambulance','call')),
  lat double precision,
  lng double precision,
  accuracy double precision,
  address_note text,
  patient_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emerg self insert" ON public.emergency_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "emerg self read" ON public.emergency_requests
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "emerg admin update" ON public.emergency_requests
  FOR UPDATE USING (has_role(auth.uid(),'admin'));

-- Pharmacy orders
CREATE TABLE IF NOT EXISTS public.pharmacy_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  prescription_url text,
  notes text,
  lat double precision,
  lng double precision,
  delivery_address text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pharmacy_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pharm self all" ON public.pharmacy_orders
  FOR ALL USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id);

-- Realtime for emergency_requests so admin sees instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_requests;
