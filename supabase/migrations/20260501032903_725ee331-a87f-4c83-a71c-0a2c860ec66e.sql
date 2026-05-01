
DROP POLICY IF EXISTS "Authenticated members view full matrimonial" ON public.matrimonial_profiles;

CREATE POLICY "Approved members view full matrimonial"
  ON public.matrimonial_profiles
  FOR SELECT TO authenticated
  USING (is_published = true AND public.is_approved_member(auth.uid()));
