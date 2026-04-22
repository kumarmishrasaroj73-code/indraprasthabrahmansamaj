
DROP POLICY IF EXISTS "Group admins update conversation" ON public.chat_conversations;
DROP POLICY IF EXISTS "Admins manage participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Admins remove participants or self leaves" ON public.chat_participants;
DROP POLICY IF EXISTS "Admins promote participants" ON public.chat_participants;

CREATE POLICY "Group admins update conversation"
  ON public.chat_conversations FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.chat_participants p WHERE p.conversation_id = chat_conversations.id AND p.user_id = auth.uid() AND p.is_admin)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage participants"
  ON public.chat_participants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.chat_participants p WHERE p.conversation_id = chat_participants.conversation_id AND p.user_id = auth.uid() AND p.is_admin)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins remove participants or self leaves"
  ON public.chat_participants FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.chat_participants p WHERE p.conversation_id = chat_participants.conversation_id AND p.user_id = auth.uid() AND p.is_admin)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins promote participants"
  ON public.chat_participants FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.chat_participants p WHERE p.conversation_id = chat_participants.conversation_id AND p.user_id = auth.uid() AND p.is_admin)
    OR public.has_role(auth.uid(), 'admin')
  );
