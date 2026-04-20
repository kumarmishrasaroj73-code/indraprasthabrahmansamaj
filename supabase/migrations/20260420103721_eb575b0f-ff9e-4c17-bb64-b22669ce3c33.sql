-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.notice_category AS ENUM ('meeting', 'circular', 'decision', 'legal');

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ NEW USER HANDLER (profile + auto-admin for seed email) ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)));

  -- Auto-grant admin role to the seed admin email
  IF NEW.email = 'admin@indraprasthbrahmansamaj.org' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
      ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ ANNOUNCEMENTS ============
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  urgent BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Announcements are public"
  ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admins manage announcements"
  ON public.announcements FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ NOTICES ============
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category notice_category NOT NULL DEFAULT 'circular',
  attachment_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notices are public"
  ON public.notices FOR SELECT USING (true);
CREATE POLICY "Admins manage notices"
  ON public.notices FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ INTRO CONTENT ============
CREATE TABLE public.intro_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (section_key, language)
);
ALTER TABLE public.intro_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Intro is public"
  ON public.intro_content FOR SELECT USING (true);
CREATE POLICY "Admins manage intro"
  ON public.intro_content FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_intro_updated_at
  BEFORE UPDATE ON public.intro_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STORAGE: notice-attachments ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('notice-attachments', 'notice-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read notice attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'notice-attachments');

CREATE POLICY "Admins can upload notice attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'notice-attachments' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notice attachments"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'notice-attachments' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete notice attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'notice-attachments' AND public.has_role(auth.uid(), 'admin'));

-- ============ SEED DATA ============
INSERT INTO public.announcements (title, description, date, urgent) VALUES
  ('Annual General Meeting — 2025', 'The AGM will be held at the Samaj Bhavan on the 15th of next month. All members are humbly requested to attend.', '2025-04-15', true),
  ('Holi Milan Samaroh', 'Join us for a traditional Holi Milan with cultural performances, prasad and community bonding.', '2025-03-25', false),
  ('Scholarship Applications Open', 'Applications for the 2025 community scholarship programme are now open for meritorious students.', '2025-03-10', false),
  ('New Matrimonial Registrations', 'We are pleased to welcome new families to our matrimonial directory. Visit the directory section to connect.', '2025-02-28', false);

INSERT INTO public.notices (title, description, date, category) VALUES
  ('Minutes of Executive Committee Meeting — Feb 2025', 'Summary of decisions taken in the executive committee meeting held on 12th February 2025.', '2025-02-15', 'meeting'),
  ('Circular: Updated Membership Guidelines', 'Revised guidelines for new and renewing members, effective from April 2025.', '2025-02-10', 'circular'),
  ('Decision: Bhavan Renovation Project', 'The committee has approved the proposal for renovation of the community Bhavan. Work begins next quarter.', '2025-01-28', 'decision'),
  ('Legal Notice: Trust Registration Update', 'Updated trust registration documents are available for member reference.', '2025-01-15', 'legal'),
  ('Notice: Election of Office Bearers', 'Nominations are invited for the upcoming election of office bearers.', '2025-01-05', 'circular');

INSERT INTO public.intro_content (section_key, language, title, body, display_order) VALUES
  ('about', 'en', 'About Indraprasth Brahman Samaj', 'Indraprasth Brahman Samaj is a community organisation devoted to preserving Brahmin heritage, fostering unity among families, and serving society through education, culture, and dharma.', 1),
  ('history', 'en', 'Our History', 'Founded with the blessings of revered elders, our Samaj has grown from a small gathering of like-minded families into a vibrant community spanning generations. Through decades we have organised cultural events, supported scholars, and built a Bhavan that remains the heart of our community.', 2),
  ('mission', 'en', 'Our Mission', 'To strengthen bonds within the Brahmin community, promote Vedic values, support education and welfare initiatives, and serve as a bridge between tradition and the modern world.', 3),
  ('vision', 'en', 'Our Vision', 'A united, enlightened community where every member thrives spiritually, intellectually, and socially — carrying forward the timeless wisdom of our forebears for generations to come.', 4);
