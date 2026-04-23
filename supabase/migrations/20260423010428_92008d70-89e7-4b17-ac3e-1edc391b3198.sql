
-- ========== Phase 8: Meetings ==========
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  agenda TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location TEXT,
  meeting_link TEXT,
  meeting_type TEXT NOT NULL DEFAULT 'in_person', -- in_person | online | hybrid
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | completed | cancelled
  minutes TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view published meetings"
  ON public.meetings FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins manage meetings"
  ON public.meetings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_meetings_scheduled_at ON public.meetings(scheduled_at DESC);

-- ========== Phase 9: Calls signaling ==========
CREATE TABLE public.chat_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  initiated_by UUID NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'voice', -- voice | video
  status TEXT NOT NULL DEFAULT 'ringing', -- ringing | active | ended | missed | declined
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

ALTER TABLE public.chat_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view calls"
  ON public.chat_calls FOR SELECT TO authenticated
  USING (public.is_chat_participant(conversation_id, auth.uid()));

CREATE POLICY "Participants start calls"
  ON public.chat_calls FOR INSERT TO authenticated
  WITH CHECK (initiated_by = auth.uid()
    AND public.is_chat_participant(conversation_id, auth.uid())
    AND public.is_approved_member(auth.uid()));

CREATE POLICY "Participants update calls"
  ON public.chat_calls FOR UPDATE TO authenticated
  USING (public.is_chat_participant(conversation_id, auth.uid()));

CREATE TABLE public.chat_call_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.chat_calls(id) ON DELETE CASCADE,
  from_user UUID NOT NULL,
  to_user UUID,
  signal_type TEXT NOT NULL, -- offer | answer | ice | bye
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_call_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Call participants view signals"
  ON public.chat_call_signals FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.chat_calls c
            WHERE c.id = chat_call_signals.call_id
              AND public.is_chat_participant(c.conversation_id, auth.uid()))
  );

CREATE POLICY "Call participants send signals"
  ON public.chat_call_signals FOR INSERT TO authenticated
  WITH CHECK (
    from_user = auth.uid()
    AND EXISTS (SELECT 1 FROM public.chat_calls c
                WHERE c.id = chat_call_signals.call_id
                  AND public.is_chat_participant(c.conversation_id, auth.uid()))
  );

CREATE INDEX idx_chat_call_signals_call ON public.chat_call_signals(call_id, created_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_call_signals;

-- ========== Directory access control ==========
CREATE TABLE public.directory_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.directory_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage directory access"
  ON public.directory_access FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users see own access row"
  ON public.directory_access FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.can_view_directory(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR EXISTS (SELECT 1 FROM public.directory_access WHERE user_id = _user_id);
$$;

-- Tighten members table SELECT: remove public access; restrict to admins + granted users
DROP POLICY IF EXISTS "Public can view published members" ON public.members;

CREATE POLICY "Authorized users view members"
  ON public.members FOR SELECT TO authenticated
  USING (is_published = true AND public.can_view_directory(auth.uid()));
