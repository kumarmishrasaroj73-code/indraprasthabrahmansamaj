
-- Phase 6: rich messaging

-- Extend chat_messages
ALTER TABLE public.chat_messages
  ADD COLUMN media_url text,
  ADD COLUMN media_mime text,
  ADD COLUMN media_name text,
  ADD COLUMN media_size integer,
  ADD COLUMN media_duration_ms integer,
  ADD COLUMN media_thumbnail text,
  ADD COLUMN reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;

CREATE INDEX idx_chat_messages_pinned ON public.chat_messages(conversation_id) WHERE is_pinned = true;

-- Reactions
CREATE TABLE public.chat_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX idx_chat_reactions_message ON public.chat_reactions(message_id);
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_participant_of_message(_message_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_messages m
    JOIN public.chat_participants p ON p.conversation_id = m.conversation_id
    WHERE m.id = _message_id AND p.user_id = _user_id
  );
$$;

CREATE POLICY "Participants view reactions"
  ON public.chat_reactions FOR SELECT TO authenticated
  USING (public.is_participant_of_message(message_id, auth.uid()));

CREATE POLICY "Users add own reaction"
  ON public.chat_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_participant_of_message(message_id, auth.uid()));

CREATE POLICY "Users remove own reaction"
  ON public.chat_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Starred messages (per user, private)
CREATE TABLE public.chat_starred (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);
ALTER TABLE public.chat_starred ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own stars"
  ON public.chat_starred FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users star messages they can see"
  ON public.chat_starred FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_participant_of_message(message_id, auth.uid()));
CREATE POLICY "Users unstar own"
  ON public.chat_starred FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Realtime
ALTER TABLE public.chat_reactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: path layout = "{conversation_id}/{user_id}/{filename}"
CREATE POLICY "Participants read chat media"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND public.is_chat_participant(((storage.foldername(name))[1])::uuid, auth.uid())
  );

CREATE POLICY "Participants upload chat media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND public.is_chat_participant(((storage.foldername(name))[1])::uuid, auth.uid())
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users delete own chat media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
