
-- ============ notifications ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,                 -- e.g. 'registration','matrimonial','rsvp','announcement','meeting','chat'
  title text NOT NULL,
  body text,
  link text,                          -- e.g. '/admin/registrations'
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Allow inserts only from definer functions (no direct insert policy)
CREATE POLICY "Admins insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- ============ push subscriptions ============
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subs"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============ helper to notify all admins ============
CREATE OR REPLACE FUNCTION public.notify_admins(
  _kind text, _title text, _body text, _link text, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
  SELECT ur.user_id, _kind, _title, _body, _link, _metadata
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
END;
$$;

-- ============ triggers ============

-- New member registration → notify admins
CREATE OR REPLACE FUNCTION public.tg_notify_new_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_admins(
    'registration',
    'New member registration',
    COALESCE(NEW.full_name,'') || COALESCE(' from ' || NEW.city,''),
    '/admin/registrations',
    jsonb_build_object('registration_id', NEW.id)
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_new_registration
AFTER INSERT ON public.member_registrations
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_registration();

-- New matrimonial profile → notify admins (when first inserted)
CREATE OR REPLACE FUNCTION public.tg_notify_new_matrimonial()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_admins(
    'matrimonial',
    'New matrimonial profile',
    COALESCE(NEW.full_name,''),
    '/admin/matrimonial',
    jsonb_build_object('profile_id', NEW.id)
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_new_matrimonial
AFTER INSERT ON public.matrimonial_profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_matrimonial();

-- New RSVP → notify admins
CREATE OR REPLACE FUNCTION public.tg_notify_new_rsvp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  SELECT title INTO v_title FROM public.events WHERE id = NEW.event_id;
  PERFORM public.notify_admins(
    'rsvp',
    'New event RSVP',
    'Event: ' || COALESCE(v_title,'(unknown)') || ' — attendees: ' || NEW.attendees,
    '/admin/events',
    jsonb_build_object('event_id', NEW.event_id, 'rsvp_id', NEW.id)
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_new_rsvp
AFTER INSERT ON public.event_rsvps
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_rsvp();

-- New announcement → notify ALL signed-up users (broadcast)
CREATE OR REPLACE FUNCTION public.tg_notify_new_announcement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
  SELECT p.user_id, 'announcement', NEW.title, LEFT(NEW.description, 200), '/announcements',
         jsonb_build_object('announcement_id', NEW.id, 'urgent', NEW.urgent)
  FROM public.profiles p;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_new_announcement
AFTER INSERT ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_announcement();

-- New meeting → notify ALL signed-up users
CREATE OR REPLACE FUNCTION public.tg_notify_new_meeting()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.is_published, true) THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    SELECT p.user_id, 'meeting', 'Meeting scheduled: ' || NEW.title,
           to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'DD Mon YYYY HH24:MI') || ' UTC',
           '/meetings',
           jsonb_build_object('meeting_id', NEW.id)
    FROM public.profiles p;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_new_meeting
AFTER INSERT ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_meeting();

-- New chat message → notify other participants
CREATE OR REPLACE FUNCTION public.tg_notify_new_chat_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sender text; v_conv text;
BEGIN
  SELECT COALESCE(display_name,'Someone') INTO v_sender FROM public.profiles WHERE user_id = NEW.sender_id;
  SELECT COALESCE(title, CASE WHEN is_group THEN 'Group chat' ELSE 'Direct message' END)
    INTO v_conv FROM public.chat_conversations WHERE id = NEW.conversation_id;

  INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
  SELECT cp.user_id, 'chat', v_sender || ' in ' || v_conv,
         LEFT(COALESCE(NEW.body, CASE NEW.message_type
            WHEN 'image' THEN '📷 Photo'
            WHEN 'video' THEN '🎬 Video'
            WHEN 'audio' THEN '🎤 Voice note'
            WHEN 'file'  THEN '📎 File'
            WHEN 'poll'  THEN '📊 Poll'
            ELSE 'New message' END), 200),
         '/chat',
         jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
  FROM public.chat_participants cp
  WHERE cp.conversation_id = NEW.conversation_id AND cp.user_id <> NEW.sender_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_new_chat_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_chat_message();
