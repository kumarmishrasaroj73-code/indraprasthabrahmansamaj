
ALTER TABLE public.chat_conversations
  ADD COLUMN is_broadcast boolean NOT NULL DEFAULT false;

CREATE TABLE public.chat_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL UNIQUE REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL,
  allow_multiple boolean NOT NULL DEFAULT false,
  closes_at timestamptz,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_polls_conv ON public.chat_polls(conversation_id);
ALTER TABLE public.chat_polls ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.chat_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  option_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id, option_id)
);
CREATE INDEX idx_chat_poll_votes_poll ON public.chat_poll_votes(poll_id);
ALTER TABLE public.chat_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view polls"
  ON public.chat_polls FOR SELECT TO authenticated
  USING (public.is_chat_participant(conversation_id, auth.uid()));

CREATE POLICY "Participants create polls"
  ON public.chat_polls FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_chat_participant(conversation_id, auth.uid()));

CREATE POLICY "Creator or admin closes poll"
  ON public.chat_polls FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.chat_participants p WHERE p.conversation_id = chat_polls.conversation_id AND p.user_id = auth.uid() AND p.is_admin)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Creator or admin deletes poll"
  ON public.chat_polls FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.chat_participants p WHERE p.conversation_id = chat_polls.conversation_id AND p.user_id = auth.uid() AND p.is_admin)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Participants view votes"
  ON public.chat_poll_votes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_polls pl
      WHERE pl.id = chat_poll_votes.poll_id
        AND public.is_chat_participant(pl.conversation_id, auth.uid())
    )
  );

CREATE POLICY "Users cast own vote"
  ON public.chat_poll_votes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_polls pl
      WHERE pl.id = chat_poll_votes.poll_id
        AND pl.is_closed = false
        AND (pl.closes_at IS NULL OR pl.closes_at > now())
        AND public.is_chat_participant(pl.conversation_id, auth.uid())
    )
  );

CREATE POLICY "Users remove own vote"
  ON public.chat_poll_votes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.enforce_broadcast_post()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_broadcast boolean;
  v_is_admin boolean;
BEGIN
  SELECT is_broadcast INTO v_is_broadcast FROM public.chat_conversations WHERE id = NEW.conversation_id;
  IF v_is_broadcast THEN
    SELECT COALESCE(is_admin, false) INTO v_is_admin FROM public.chat_participants
      WHERE conversation_id = NEW.conversation_id AND user_id = NEW.sender_id;
    IF NOT COALESCE(v_is_admin, false) AND NOT public.has_role(NEW.sender_id, 'admin') THEN
      RAISE EXCEPTION 'Only admins can post in broadcast channels';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_broadcast_post
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_broadcast_post();

ALTER TABLE public.chat_polls REPLICA IDENTITY FULL;
ALTER TABLE public.chat_poll_votes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_poll_votes;
