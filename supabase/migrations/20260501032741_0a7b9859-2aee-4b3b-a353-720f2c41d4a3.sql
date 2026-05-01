
-- Remove the anon policies that allowed raw table reads (we only want masked view access)
DROP POLICY IF EXISTS "Anon view published matrimonial via view" ON public.matrimonial_profiles;
DROP POLICY IF EXISTS "Anon view published donations via view" ON public.donations;

-- Recreate the views as SECURITY DEFINER (the only path anon has into this data,
-- and they expose only safe columns).
DROP VIEW IF EXISTS public.matrimonial_public;
CREATE VIEW public.matrimonial_public
WITH (security_invoker = false) AS
SELECT
  id,
  full_name,
  gender,
  CASE WHEN date_of_birth IS NOT NULL
       THEN date_part('year', age(date_of_birth))::int
       ELSE NULL END AS age,
  height_cm,
  gotra,
  education,
  profession,
  income_range,
  city,
  marital_status,
  about,
  photo_url,
  created_at
FROM public.matrimonial_profiles
WHERE is_published = true;

GRANT SELECT ON public.matrimonial_public TO anon, authenticated;

DROP VIEW IF EXISTS public.donations_public;
CREATE VIEW public.donations_public
WITH (security_invoker = false) AS
SELECT
  id,
  CASE WHEN is_anonymous THEN 'Anonymous' ELSE donor_name END AS donor_name,
  amount,
  currency,
  method,
  message,
  donated_on,
  is_anonymous,
  created_at
FROM public.donations
WHERE is_published = true;

GRANT SELECT ON public.donations_public TO anon, authenticated;
