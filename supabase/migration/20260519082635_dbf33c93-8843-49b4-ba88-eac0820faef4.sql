REVOKE EXECUTE ON FUNCTION public.verify_doctor(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_doctor(uuid, boolean) TO authenticated;