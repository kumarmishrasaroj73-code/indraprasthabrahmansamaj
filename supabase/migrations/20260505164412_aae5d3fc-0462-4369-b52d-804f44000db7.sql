-- Festivals
CREATE TABLE public.cultural_festivals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_hi text,
  date date NOT NULL,
  description_en text,
  description_hi text,
  is_published boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cultural_festivals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Festivals public read" ON public.cultural_festivals FOR SELECT USING (is_published = true);
CREATE POLICY "Admins manage festivals" ON public.cultural_festivals FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_festivals_updated BEFORE UPDATE ON public.cultural_festivals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Shlokas
CREATE TABLE public.cultural_shlokas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sanskrit text NOT NULL,
  meaning_en text,
  meaning_hi text,
  source text,
  is_published boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cultural_shlokas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shlokas public read" ON public.cultural_shlokas FOR SELECT USING (is_published = true);
CREATE POLICY "Admins manage shlokas" ON public.cultural_shlokas FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_shlokas_updated BEFORE UPDATE ON public.cultural_shlokas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Temples
CREATE TABLE public.cultural_temples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_hi text,
  deity_en text,
  deity_hi text,
  city text,
  address text,
  is_published boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cultural_temples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Temples public read" ON public.cultural_temples FOR SELECT USING (is_published = true);
CREATE POLICY "Admins manage temples" ON public.cultural_temples FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_temples_updated BEFORE UPDATE ON public.cultural_temples FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Matrimonial shortlist
CREATE TABLE public.matrimonial_shortlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, profile_id)
);
ALTER TABLE public.matrimonial_shortlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own shortlist" ON public.matrimonial_shortlist FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users add to own shortlist" ON public.matrimonial_shortlist FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND is_approved_member(auth.uid()));
CREATE POLICY "Users remove own shortlist" ON public.matrimonial_shortlist FOR DELETE TO authenticated USING (user_id = auth.uid());