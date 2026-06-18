
-- ===== SECURITY HARDENING =====

-- 1) DOCTORS: drop blanket-true read; patients use public_doctors view
DROP POLICY IF EXISTS "doctors listing read" ON public.doctors;

-- Defense in depth: revoke sensitive-column SELECTs from auth/anon
REVOKE SELECT (phone, alt_phone, clinic_address, registration_number, registration_council,
  id_proof_url, medical_degree_url, registration_certificate_url, experience_certificate_url,
  additional_documents, previous_hospitals, achievements, rejection_reason, age, gender)
  ON public.doctors FROM authenticated, anon;

GRANT SELECT ON public.public_doctors TO anon, authenticated;

-- 2) PAYMENTS: patient cannot flip status
DROP POLICY IF EXISTS "pay patient update" ON public.payments;

CREATE POLICY "pay patient update limited" ON public.payments
  FOR UPDATE TO authenticated
  USING (auth.uid() = patient_id AND status = 'pending'::payment_status)
  WITH CHECK (auth.uid() = patient_id AND status = 'pending'::payment_status);

CREATE POLICY "pay admin update" ON public.payments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) APPOINTMENTS: patient cannot self-confirm
DROP POLICY IF EXISTS "appt patient update" ON public.appointments;

CREATE POLICY "appt patient update limited" ON public.appointments
  FOR UPDATE TO authenticated
  USING (auth.uid() = patient_id AND status = 'pending_payment'::appointment_status)
  WITH CHECK (
    auth.uid() = patient_id
    AND status IN ('pending_payment'::appointment_status, 'cancelled'::appointment_status)
  );

CREATE POLICY "appt doctor update" ON public.appointments
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = appointments.doctor_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = appointments.doctor_id AND d.user_id = auth.uid()));

CREATE POLICY "appt admin update" ON public.appointments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
