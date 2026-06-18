CREATE TABLE public.video_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vcm_appt ON public.video_chat_messages(appointment_id, created_at);

ALTER TABLE public.video_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vcm parties read" ON public.video_chat_messages
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.appointments a
  LEFT JOIN public.doctors d ON d.id = a.doctor_id
  WHERE a.id = video_chat_messages.appointment_id
    AND (a.patient_id = auth.uid() OR d.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
));

CREATE POLICY "vcm parties insert" ON public.video_chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.appointments a
    LEFT JOIN public.doctors d ON d.id = a.doctor_id
    WHERE a.id = video_chat_messages.appointment_id
      AND (a.patient_id = auth.uid() OR d.user_id = auth.uid())
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.video_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;