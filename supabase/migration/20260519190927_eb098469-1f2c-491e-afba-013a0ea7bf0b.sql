
-- Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hospital';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ambulance';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
