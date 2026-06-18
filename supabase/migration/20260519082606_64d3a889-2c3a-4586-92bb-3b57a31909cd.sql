CREATE OR REPLACE FUNCTION public.verify_doctor(_doctor_id uuid, _verified boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can verify doctors';
  END IF;

  UPDATE public.doctors SET is_verified = _verified WHERE id = _doctor_id
    RETURNING user_id INTO _user;

  IF _verified AND _user IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user, 'doctor'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF NOT _verified AND _user IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = _user AND role = 'doctor'::app_role;
  END IF;
END;
$$;