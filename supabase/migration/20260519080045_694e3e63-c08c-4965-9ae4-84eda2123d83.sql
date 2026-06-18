
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('patient','doctor','admin');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Doctors
CREATE TABLE public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  qualifications TEXT,
  bio TEXT,
  experience_years INT NOT NULL DEFAULT 0,
  consultation_fee NUMERIC(10,2) NOT NULL DEFAULT 500,
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.5,
  avatar_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Appointments
CREATE TYPE public.appointment_status AS ENUM ('pending_payment','confirmed','in_progress','completed','cancelled','no_show');
CREATE TYPE public.appointment_mode AS ENUM ('video','in_person');

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INT NOT NULL DEFAULT 30,
  mode public.appointment_mode NOT NULL DEFAULT 'video',
  status public.appointment_status NOT NULL DEFAULT 'pending_payment',
  reason TEXT,
  is_emergency BOOLEAN NOT NULL DEFAULT false,
  priority INT NOT NULL DEFAULT 0,
  video_room_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments
CREATE TYPE public.payment_method AS ENUM ('upi','card','wallet','netbanking');
CREATE TYPE public.payment_status AS ENUM ('pending','processing','succeeded','failed','refunded');

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  method public.payment_method NOT NULL DEFAULT 'upi',
  status public.payment_status NOT NULL DEFAULT 'pending',
  upi_id TEXT,
  utr TEXT,
  provider_ref TEXT,
  failure_reason TEXT,
  refunded_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  invoice_number TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

-- Prescriptions
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diagnosis TEXT,
  medicines JSONB NOT NULL DEFAULT '[]'::jsonb,
  advice TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Doctor notes/tasks
CREATE TABLE public.doctor_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  is_task BOOLEAN NOT NULL DEFAULT false,
  done BOOLEAN NOT NULL DEFAULT false,
  remind_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profile auto-create + default patient role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'patient')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Invoice number generator
CREATE OR REPLACE FUNCTION public.gen_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || to_char(now(),'YYYYMMDD') || '-' || substr(replace(NEW.id::text,'-',''),1,8);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_invoice_number BEFORE INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.gen_invoice_number();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'doctor'));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Roles
CREATE POLICY "roles self read" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles admin write" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Doctors
CREATE POLICY "doctors public read" ON public.doctors FOR SELECT USING (true);
CREATE POLICY "doctors self write" ON public.doctors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "doctors self insert" ON public.doctors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "doctors admin all" ON public.doctors FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Appointments
CREATE POLICY "appt patient read" ON public.appointments FOR SELECT USING (auth.uid() = patient_id OR public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));
CREATE POLICY "appt patient create" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "appt patient update" ON public.appointments FOR UPDATE USING (auth.uid() = patient_id OR EXISTS(SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- Payments
CREATE POLICY "pay patient read" ON public.payments FOR SELECT USING (auth.uid() = patient_id OR public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));
CREATE POLICY "pay patient create" ON public.payments FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "pay patient update" ON public.payments FOR UPDATE USING (auth.uid() = patient_id OR public.has_role(auth.uid(),'admin'));

-- Prescriptions
CREATE POLICY "rx read" ON public.prescriptions FOR SELECT USING (auth.uid() = patient_id OR EXISTS(SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "rx doctor write" ON public.prescriptions FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));
CREATE POLICY "rx doctor update" ON public.prescriptions FOR UPDATE USING (EXISTS(SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));

-- Doctor notes
CREATE POLICY "notes self all" ON public.doctor_notes FOR ALL USING (auth.uid() = doctor_user_id) WITH CHECK (auth.uid() = doctor_user_id);

-- Notifications
CREATE POLICY "notif self read" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif self update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notif admin write" ON public.notifications FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin') OR auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_appt_patient ON public.appointments(patient_id);
CREATE INDEX idx_appt_doctor ON public.appointments(doctor_id);
CREATE INDEX idx_appt_time ON public.appointments(scheduled_at);
CREATE INDEX idx_pay_patient ON public.payments(patient_id);
CREATE INDEX idx_pay_status ON public.payments(status);
CREATE INDEX idx_rx_patient ON public.prescriptions(patient_id);
