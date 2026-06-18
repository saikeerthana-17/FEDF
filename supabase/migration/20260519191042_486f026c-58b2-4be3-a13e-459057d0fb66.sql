
-- ============ HOSPITALS ============
CREATE TABLE public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  hospital_type text NOT NULL DEFAULT 'multi_specialty',
  description text,
  address text,
  city text,
  state text,
  pincode text,
  phone text,
  email text,
  website text,
  lat double precision,
  lng double precision,
  is_verified boolean NOT NULL DEFAULT false,
  application_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.hospital_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  pincode text,
  phone text,
  lat double precision,
  lng double precision,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.hospital_beds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.hospital_branches(id) ON DELETE CASCADE,
  ward_type text NOT NULL,
  total_beds integer NOT NULL DEFAULT 0,
  available_beds integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, ward_type)
);

CREATE TABLE public.hospital_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  staff_role text NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, user_id)
);

-- ============ AMBULANCE ============
CREATE TABLE public.ambulance_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid,
  name text NOT NULL,
  city text,
  phone text,
  email text,
  is_verified boolean NOT NULL DEFAULT false,
  application_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ambulance_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.ambulance_providers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  license_number text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ambulances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.ambulance_providers(id) ON DELETE CASCADE,
  vehicle_number text NOT NULL,
  ambulance_type text NOT NULL DEFAULT 'basic',
  active_driver_id uuid REFERENCES public.ambulance_drivers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'offline',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, vehicle_number)
);

CREATE TABLE public.ambulance_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambulance_id uuid NOT NULL REFERENCES public.ambulances(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  heading double precision,
  speed_kmh double precision,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_amb_loc_recent ON public.ambulance_locations(ambulance_id, recorded_at DESC);

CREATE TABLE public.ambulance_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL,
  ambulance_id uuid REFERENCES public.ambulances(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.ambulance_drivers(id) ON DELETE SET NULL,
  provider_id uuid REFERENCES public.ambulance_providers(id) ON DELETE SET NULL,
  ambulance_type text NOT NULL DEFAULT 'basic',
  pickup_address text,
  pickup_lat double precision NOT NULL,
  pickup_lng double precision NOT NULL,
  drop_address text,
  drop_lat double precision,
  drop_lng double precision,
  status text NOT NULL DEFAULT 'requested',
  fare_estimate numeric,
  fare_final numeric,
  eta_minutes integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ VIDEO ============
CREATE TABLE public.video_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE,
  room_name text NOT NULL,
  room_url text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ Helper functions ============
CREATE OR REPLACE FUNCTION public.is_hospital_member(_hospital_id uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.hospitals h WHERE h.id = _hospital_id AND h.owner_user_id = _user)
      OR EXISTS(SELECT 1 FROM public.hospital_staff s WHERE s.hospital_id = _hospital_id AND s.user_id = _user);
$$;

CREATE OR REPLACE FUNCTION public.is_provider_owner(_provider_id uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.ambulance_providers p WHERE p.id = _provider_id AND p.owner_user_id = _user);
$$;

CREATE OR REPLACE FUNCTION public.is_ambulance_driver(_ambulance_id uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.ambulances a
    JOIN public.ambulance_drivers d ON d.id = a.active_driver_id
    WHERE a.id = _ambulance_id AND d.user_id = _user
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_hospital_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_provider_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_ambulance_driver(uuid, uuid) FROM anon;

-- ============ RLS ============
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulance_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulance_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulance_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulance_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;

-- Hospitals
CREATE POLICY "hospitals public verified read" ON public.hospitals FOR SELECT TO authenticated
  USING (is_verified = true OR owner_user_id = auth.uid() OR public.is_hospital_member(id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "hospitals owner insert" ON public.hospitals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "hospitals owner update" ON public.hospitals FOR UPDATE TO authenticated
  USING (auth.uid() = owner_user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = owner_user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "hospitals admin all" ON public.hospitals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Branches
CREATE POLICY "branches read" ON public.hospital_branches FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = hospital_id AND (h.is_verified OR h.owner_user_id = auth.uid() OR public.is_hospital_member(h.id, auth.uid()) OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "branches write" ON public.hospital_branches FOR ALL TO authenticated
  USING (public.is_hospital_member(hospital_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_hospital_member(hospital_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- Beds
CREATE POLICY "beds read" ON public.hospital_beds FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hospital_branches b JOIN public.hospitals h ON h.id=b.hospital_id WHERE b.id = branch_id AND (h.is_verified OR public.is_hospital_member(h.id, auth.uid()) OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "beds write" ON public.hospital_beds FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hospital_branches b WHERE b.id = branch_id AND (public.is_hospital_member(b.hospital_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.hospital_branches b WHERE b.id = branch_id AND (public.is_hospital_member(b.hospital_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))));

-- Staff
CREATE POLICY "staff read self/hospital" ON public.hospital_staff FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_hospital_member(hospital_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "staff write owner" ON public.hospital_staff FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = hospital_id AND (h.owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = hospital_id AND (h.owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- Providers
CREATE POLICY "providers read" ON public.ambulance_providers FOR SELECT TO authenticated
  USING (is_verified OR owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "providers insert" ON public.ambulance_providers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "providers update" ON public.ambulance_providers FOR UPDATE TO authenticated
  USING (auth.uid() = owner_user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = owner_user_id OR public.has_role(auth.uid(),'admin'));

-- Drivers
CREATE POLICY "drivers read" ON public.ambulance_drivers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_provider_owner(provider_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "drivers write owner" ON public.ambulance_drivers FOR ALL TO authenticated
  USING (public.is_provider_owner(provider_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_provider_owner(provider_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- Ambulances
CREATE POLICY "ambulances read" ON public.ambulances FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.ambulance_providers p WHERE p.id = provider_id AND (p.is_verified OR p.owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
    OR public.is_ambulance_driver(id, auth.uid())
  );
CREATE POLICY "ambulances write owner" ON public.ambulances FOR ALL TO authenticated
  USING (public.is_provider_owner(provider_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_provider_owner(provider_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ambulances driver status update" ON public.ambulances FOR UPDATE TO authenticated
  USING (public.is_ambulance_driver(id, auth.uid()))
  WITH CHECK (public.is_ambulance_driver(id, auth.uid()));

-- Locations: readable by anyone authenticated (live tracking); writable only by driver/owner/admin
CREATE POLICY "amb_loc read all auth" ON public.ambulance_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "amb_loc driver insert" ON public.ambulance_locations FOR INSERT TO authenticated
  WITH CHECK (
    public.is_ambulance_driver(ambulance_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.ambulances a WHERE a.id = ambulance_id AND public.is_provider_owner(a.provider_id, auth.uid()))
    OR public.has_role(auth.uid(),'admin')
  );

-- Bookings
CREATE POLICY "bookings patient read" ON public.ambulance_bookings FOR SELECT TO authenticated
  USING (
    patient_user_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR (provider_id IS NOT NULL AND public.is_provider_owner(provider_id, auth.uid()))
    OR (driver_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.ambulance_drivers d WHERE d.id = driver_id AND d.user_id = auth.uid()))
  );
CREATE POLICY "bookings patient insert" ON public.ambulance_bookings FOR INSERT TO authenticated
  WITH CHECK (patient_user_id = auth.uid());
CREATE POLICY "bookings patient cancel" ON public.ambulance_bookings FOR UPDATE TO authenticated
  USING (patient_user_id = auth.uid() AND status IN ('requested','searching'))
  WITH CHECK (patient_user_id = auth.uid() AND status IN ('requested','cancelled'));
CREATE POLICY "bookings provider update" ON public.ambulance_bookings FOR UPDATE TO authenticated
  USING (
    (provider_id IS NOT NULL AND public.is_provider_owner(provider_id, auth.uid()))
    OR (driver_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.ambulance_drivers d WHERE d.id = driver_id AND d.user_id = auth.uid()))
    OR public.has_role(auth.uid(),'admin')
  )
  WITH CHECK (
    (provider_id IS NOT NULL AND public.is_provider_owner(provider_id, auth.uid()))
    OR (driver_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.ambulance_drivers d WHERE d.id = driver_id AND d.user_id = auth.uid()))
    OR public.has_role(auth.uid(),'admin')
  );

-- Video sessions
CREATE POLICY "video session read parties" ON public.video_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a LEFT JOIN public.doctors d ON d.id = a.doctor_id
      WHERE a.id = appointment_id AND (a.patient_id = auth.uid() OR d.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
    )
  );

-- Enable realtime for live ambulance tracking + bookings
ALTER TABLE public.ambulance_locations REPLICA IDENTITY FULL;
ALTER TABLE public.ambulance_bookings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ambulance_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ambulance_bookings;
