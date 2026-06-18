-- Super admin role management functions
-- Allow super_admin (and admin) to grant/revoke roles by email and list members

CREATE OR REPLACE FUNCTION public.grant_role_by_email(_email text, _role public.app_role)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Only admins can grant roles';
  END IF;

  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'No user found with that email';
  END IF;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (_uid, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_role(_user_id uuid, _role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Only admins can revoke roles';
  END IF;

  -- Protect: super_admin cannot be self-revoked by a non-super
  IF _role = 'super_admin'::public.app_role AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only super admins can revoke super_admin';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_role_members(_role public.app_role)
RETURNS TABLE(user_id uuid, email text, full_name text, granted_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Only admins can list role members';
  END IF;

  RETURN QUERY
  SELECT ur.user_id, u.email::text, p.full_name, NULL::timestamptz
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = _role
  ORDER BY u.email;
END;
$$;