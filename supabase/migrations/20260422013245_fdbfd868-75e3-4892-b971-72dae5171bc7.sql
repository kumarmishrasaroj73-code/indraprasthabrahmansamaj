
-- Phase 5: Chat foundation

-- Helper: check if user is an approved member (their email is in members table & published)
CREATE OR REPLACE FUNCTION public.is_approved_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members m
    JOIN auth.users u ON lower(u.email) = lower(m.email)
    WHERE u.id = _user_id AND m.is_published = true
  )
  OR public.has_role(_user_id, 'admin');
$$;

-- Conversations
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  title text,
  avatar_url text,
  created_by uuid,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Participants
CREATE TABLE public.chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
CREATE INDEX idx_chat_participants_user ON public.chat_participants(user_id);
CREATE INDEX idx_chat_participants_conv ON public.chat_participants(conversation_id);
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- Messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text,
  message_type text NOT NULL DEFAULT 'text',
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
CREATE INDEX idx_chat_messages_conv_created ON public.chat_messages(conversation_id, created_at DESC);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Recursion-safe participant check
CREATE OR REPLACE FUNCTION public.is_chat_participant(_conv_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE conversation_id = _conv_id AND user_id = _user_id
  );
$$;

-- Trigger: bump conversation last_message_at when a message is inserted
CREATE OR REPLACE FUNCTION public.bump_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_conversations
    SET last_message_at = NEW.created_at, updated_at = now()
    WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_bump_conversation
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_on_message();

CREATE TRIGGER trg_chat_conversations_updated
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: chat_conversations
CREATE POLICY "Participants view their conversations"
  ON public.chat_conversations FOR SELECT
  TO authenticated
  USING (public.is_chat_participant(id, auth.uid()));

CREATE POLICY "Approved members create conversations"
  ON public.chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved_member(auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "Group admins update conversation"
  ON public.chat_conversations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.chat_participants p
            WHERE p.conversation_id = chat_conversations.id
              AND p.user_id = auth.uid()
              AND p.is_admin = true)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage conversations"
  ON public.chat_conversations FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: chat_participants
CREATE POLICY "Participants view co-participants"
  ON public.chat_participants FOR SELECT
  TO authenticated
  USING (public.is_chat_participant(conversation_id, auth.uid()));

CREATE POLICY "Approved members add themselves or others to convos they create/admin"
  ON public.chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_approved_member(auth.uid())
    AND (
      -- adding self
      user_id = auth.uid()
      -- OR group admin adding others
      OR EXISTS (SELECT 1 FROM public.chat_participants p
                 WHERE p.conversation_id = chat_participants.conversation_id
                   AND p.user_id = auth.uid()
                   AND p.is_admin = true)
      -- OR site admin
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Users update own participant row"
  ON public.chat_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users leave or admins remove"
  ON public.chat_participants FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.chat_participants p
               WHERE p.conversation_id = chat_participants.conversation_id
                 AND p.user_id = auth.uid()
                 AND p.is_admin = true)
    OR public.has_role(auth.uid(), 'admin')
  );

-- RLS: chat_messages
CREATE POLICY "Participants view messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (public.is_chat_participant(conversation_id, auth.uid()));

CREATE POLICY "Participants send messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_chat_participant(conversation_id, auth.uid())
    AND public.is_approved_member(auth.uid())
  );

CREATE POLICY "Senders edit own messages"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Senders or admins delete messages"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Realtime
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
