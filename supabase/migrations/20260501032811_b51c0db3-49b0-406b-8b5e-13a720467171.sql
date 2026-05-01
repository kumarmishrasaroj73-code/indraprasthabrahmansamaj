
-- Switch views back to security_invoker = true so they respect the caller's permissions.
DROP VIEW IF EXISTS public.matrimonial_public;
CREATE VIEW public.matrimonial_public
WITH (security_invoker = true) AS
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

DROP VIEW IF EXISTS public.donations_public;
CREATE VIEW public.donations_public
WITH (security_invoker = true) AS
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

-- Revoke direct anon access to the underlying tables — anon can ONLY use the views.
REVOKE SELECT ON public.matrimonial_profiles FROM anon;
REVOKE SELECT ON public.donations FROM anon;

-- The views need to be readable by both roles
GRANT SELECT ON public.matrimonial_public TO anon, authenticated;
GRANT SELECT ON public.donations_public TO anon, authenticated;

-- Re-add a narrow anon policy on base tables (required so the view's
-- security_invoker mode passes RLS for anon callers). Even though anon has
-- no GRANT to query the base table directly through PostgREST, the view
-- (running as the caller) needs RLS to allow reading the published rows.
DROP POLICY IF EXISTS "Anon read published via view only" ON public.matrimonial_profiles;
CREATE POLICY "Anon read published via view only"
  ON public.matrimonial_profiles
  FOR SELECT TO anon
  USING (is_published = true);

DROP POLICY IF EXISTS "Anon read published donations via view only" ON public.donations;
CREATE POLICY "Anon read published donations via view only"
  ON public.donations
  FOR SELECT TO anon
  USING (is_published = true);
