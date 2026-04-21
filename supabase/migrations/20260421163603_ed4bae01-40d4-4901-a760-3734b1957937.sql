
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  gotra TEXT,
  family_head TEXT,
  profession TEXT,
  education TEXT,
  city TEXT,
  locality TEXT,
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.matrimonial_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male','female','other')),
  date_of_birth DATE,
  height_cm INT,
  gotra TEXT,
  education TEXT,
  profession TEXT,
  income_range TEXT,
  city TEXT,
  marital_status TEXT DEFAULT 'never_married',
  about TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  photo_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrimonial_profiles ENABLE ROW LEVEL SECURITY;

-- Public read of published rows
CREATE POLICY "Public can view published members"
  ON public.members FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can view all members"
  ON public.members FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert members"
  ON public.members FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update members"
  ON public.members FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete members"
  ON public.members FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view published matrimonial"
  ON public.matrimonial_profiles FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can view all matrimonial"
  ON public.matrimonial_profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert matrimonial"
  ON public.matrimonial_profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update matrimonial"
  ON public.matrimonial_profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete matrimonial"
  ON public.matrimonial_profiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger (function may already exist from earlier migration; create if missing)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER set_members_updated_at BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_matrimonial_updated_at BEFORE UPDATE ON public.matrimonial_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket for member/matrimonial photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-photos', 'community-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view community photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-photos');

CREATE POLICY "Admins can upload community photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'community-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update community photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'community-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete community photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'community-photos' AND public.has_role(auth.uid(), 'admin'));
