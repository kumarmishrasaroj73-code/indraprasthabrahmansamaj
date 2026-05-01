
ALTER VIEW public.matrimonial_public SET (security_invoker = true);
ALTER VIEW public.donations_public  SET (security_invoker = true);

-- Re-grant after ALTER (defensive)
GRANT SELECT ON public.matrimonial_public TO anon, authenticated;
GRANT SELECT ON public.donations_public  TO anon, authenticated;

-- The underlying tables have RLS enabled. With security_invoker, anon
-- callers querying these views need an SELECT policy on the base table.
-- Add a narrow anon policy that ONLY permits SELECT on published rows
-- (the view further hides sensitive columns).
DROP POLICY IF EXISTS "Anon view published matrimonial via view" ON public.matrimonial_profiles;
CREATE POLICY "Anon view published matrimonial via view"
  ON public.matrimonial_profiles
  FOR SELECT TO anon
  USING (is_published = true);

DROP POLICY IF EXISTS "Anon view published donations via view" ON public.donations;
CREATE POLICY "Anon view published donations via view"
  ON public.donations
  FOR SELECT TO anon
  USING (is_published = true);
