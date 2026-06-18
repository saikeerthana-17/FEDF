CREATE TABLE IF NOT EXISTS public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role app_role NOT NULL,
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_invites_email_idx ON public.admin_invites (lower(email));
CREATE INDEX IF NOT EXISTS admin_invites_status_idx ON public.admin_invites (status);

ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

-- Admins can read all invites; invitees can read their own (matched by email) for acceptance UX
CREATE POLICY "invites admin read"
ON public.admin_invites FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR lower(email) = lower((SELECT u.email FROM auth.users u WHERE u.id = auth.uid()))
);

-- No direct client writes; all mutations go through server functions (supabaseAdmin / SECURITY DEFINER).
-- Intentionally NO INSERT/UPDATE/DELETE policies.