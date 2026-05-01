
-- =========================================================
-- 1. MATRIMONIAL PROFILES — drop public PII exposure
-- =========================================================
DROP POLICY IF EXISTS "Public can view published matrimonial" ON public.matrimonial_profiles;

-- Public-safe view (no contact fields, no DOB — only year-of-birth derivative)
CREATE OR REPLACE VIEW public.matrimonial_public AS
SELECT
  id,
  full_name,
  gender,
  -- expose only an age (years), not the raw DOB
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

-- Authenticated members can still see the FULL row (incl. contact)
CREATE POLICY "Authenticated members view full matrimonial"
  ON public.matrimonial_profiles
  FOR SELECT
  TO authenticated
  USING (is_published = true);

-- =========================================================
-- 2. CONTACT REQUESTS for matrimonial
-- =========================================================
CREATE TABLE IF NOT EXISTS public.matrimonial_contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.matrimonial_profiles(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, requester_id)
);

ALTER TABLE public.matrimonial_contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own contact requests"
  ON public.matrimonial_contact_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND status = 'pending');

CREATE POLICY "Users view own contact requests"
  ON public.matrimonial_contact_requests
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage contact requests"
  ON public.matrimonial_contact_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_mcr_updated
  BEFORE UPDATE ON public.matrimonial_contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notify admins on new contact request
CREATE OR REPLACE FUNCTION public.tg_notify_new_contact_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  SELECT full_name INTO v_name FROM public.matrimonial_profiles WHERE id = NEW.profile_id;
  PERFORM public.notify_admins(
    'matrimonial',
    'New contact request',
    'A member has requested contact details for ' || COALESCE(v_name, '(profile)'),
    '/admin/matrimonial',
    jsonb_build_object('request_id', NEW.id, 'profile_id', NEW.profile_id)
  );
  RETURN NEW;
END $$;

CREATE TRIGGER trg_mcr_notify
  AFTER INSERT ON public.matrimonial_contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_contact_request();

-- =========================================================
-- 3. DONATIONS — mask donor name when anonymous
-- =========================================================
DROP POLICY IF EXISTS "Public view published donations" ON public.donations;

CREATE OR REPLACE VIEW public.donations_public AS
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

-- =========================================================
-- 4. REALTIME — restrict channel subscriptions
-- =========================================================
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to receive broadcasts/presence/postgres_changes,
-- but only on topics they are entitled to.
DROP POLICY IF EXISTS "Authenticated can read own realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated can read own realtime topics"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    -- chat conversation channels: topic must be 'chat:<conversation_id>'
    (topic LIKE 'chat:%' AND public.is_chat_participant(
       NULLIF(split_part(topic, ':', 2), '')::uuid, auth.uid()))
    -- per-user notification channel: 'user:<user_id>'
    OR (topic LIKE 'user:%' AND split_part(topic, ':', 2) = auth.uid()::text)
    -- public broadcast channels (announcements, etc.)
    OR topic IN ('announcements', 'meetings', 'events')
  );

DROP POLICY IF EXISTS "Authenticated can broadcast on own topics" ON realtime.messages;
CREATE POLICY "Authenticated can broadcast on own topics"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (topic LIKE 'chat:%' AND public.is_chat_participant(
       NULLIF(split_part(topic, ':', 2), '')::uuid, auth.uid()))
    OR (topic LIKE 'user:%' AND split_part(topic, ':', 2) = auth.uid()::text)
  );

-- =========================================================
-- 5. CHAT-MEDIA bucket — restrict UPDATE to file owner
-- =========================================================
DROP POLICY IF EXISTS "Chat media owner update" ON storage.objects;
CREATE POLICY "Chat media owner update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =========================================================
-- 6. Tighten notify_admins — only callable from triggers
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.notify_admins(text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
