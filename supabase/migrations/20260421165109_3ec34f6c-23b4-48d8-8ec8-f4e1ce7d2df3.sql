
-- ============ EVENTS ============
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  location TEXT,
  image_url TEXT,
  allow_rsvp BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view published events" ON public.events
  FOR SELECT USING (is_published = true);
CREATE POLICY "Admins manage events" ON public.events
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER set_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ EVENT RSVPS ============
CREATE TABLE public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  attendees INT NOT NULL DEFAULT 1 CHECK (attendees >= 1 AND attendees <= 20),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own rsvps" ON public.event_rsvps
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all rsvps" ON public.event_rsvps
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own rsvp" ON public.event_rsvps
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own rsvp" ON public.event_rsvps
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own rsvp" ON public.event_rsvps
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ GALLERY ============
CREATE TABLE public.gallery_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  event_date DATE,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gallery_albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view published albums" ON public.gallery_albums
  FOR SELECT USING (is_published = true);
CREATE POLICY "Admins manage albums" ON public.gallery_albums
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER set_albums_updated_at BEFORE UPDATE ON public.gallery_albums
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES public.gallery_albums(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view photos of published albums" ON public.gallery_photos
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.gallery_albums a
    WHERE a.id = album_id AND a.is_published = true
  ));
CREATE POLICY "Admins manage photos" ON public.gallery_photos
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ MEMBER REGISTRATIONS ============
CREATE TABLE public.member_registrations (
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
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.member_registrations ENABLE ROW LEVEL SECURITY;
-- Anyone (anon or authenticated) can submit a registration
CREATE POLICY "Anyone can submit registration" ON public.member_registrations
  FOR INSERT WITH CHECK (status = 'pending');
CREATE POLICY "Admins view registrations" ON public.member_registrations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update registrations" ON public.member_registrations
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete registrations" ON public.member_registrations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER set_registrations_updated_at BEFORE UPDATE ON public.member_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ DONATIONS ============
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  method TEXT,
  message TEXT,
  donated_on DATE NOT NULL DEFAULT CURRENT_DATE,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view published donations" ON public.donations
  FOR SELECT USING (is_published = true);
CREATE POLICY "Admins manage donations" ON public.donations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER set_donations_updated_at BEFORE UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ STORAGE: gallery bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins upload gallery" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gallery' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update gallery" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'gallery' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete gallery" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'gallery' AND public.has_role(auth.uid(),'admin'));
