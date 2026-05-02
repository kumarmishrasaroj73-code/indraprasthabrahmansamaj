-- 1. Extend role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'volunteer';

-- 2. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS gotra text,
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS city text;

-- 3. Helper: moderator or admin
CREATE OR REPLACE FUNCTION public.is_moderator_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
      OR public.has_role(_user_id, 'moderator'::app_role)
$$;

-- 4. follows table
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view follows"
  ON public.follows FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users follow as themselves"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users unfollow themselves"
  ON public.follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

-- 5. posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  body text,
  image_url text,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (body IS NOT NULL OR image_url IS NOT NULL)
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view visible posts"
  ON public.posts FOR SELECT TO authenticated
  USING (is_hidden = false OR author_id = auth.uid() OR public.is_moderator_or_admin(auth.uid()));

CREATE POLICY "Approved members create posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_approved_member(auth.uid()));

CREATE POLICY "Author or mod updates post"
  ON public.posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_moderator_or_admin(auth.uid()));

CREATE POLICY "Author or mod deletes post"
  ON public.posts FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_moderator_or_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);

CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. post_likes
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view likes"
  ON public.post_likes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users like as themselves"
  ON public.post_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users remove own like"
  ON public.post_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes(post_id);

-- 7. post_comments
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 2000),
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view visible comments"
  ON public.post_comments FOR SELECT TO authenticated
  USING (is_hidden = false OR author_id = auth.uid() OR public.is_moderator_or_admin(auth.uid()));

CREATE POLICY "Approved members comment"
  ON public.post_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_approved_member(auth.uid()));

CREATE POLICY "Author or mod updates comment"
  ON public.post_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_moderator_or_admin(auth.uid()));

CREATE POLICY "Author or mod deletes comment"
  ON public.post_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_moderator_or_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id, created_at);

CREATE TRIGGER trg_post_comments_updated_at
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. Notification triggers
CREATE OR REPLACE FUNCTION public.tg_notify_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_author uuid; v_liker text;
BEGIN
  SELECT author_id INTO v_author FROM public.posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, 'Someone') INTO v_liker FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
  VALUES (v_author, 'like', v_liker || ' liked your post', NULL, '/community',
          jsonb_build_object('post_id', NEW.post_id));
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_post_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_post_like();

CREATE OR REPLACE FUNCTION public.tg_notify_post_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_author uuid; v_commenter text;
BEGIN
  SELECT author_id INTO v_author FROM public.posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.author_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, 'Someone') INTO v_commenter FROM public.profiles WHERE user_id = NEW.author_id;
  INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
  VALUES (v_author, 'comment', v_commenter || ' commented on your post', LEFT(NEW.body, 200), '/community',
          jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id));
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_post_comment
  AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_post_comment();

CREATE OR REPLACE FUNCTION public.tg_notify_followers_new_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_author text;
BEGIN
  IF NEW.is_hidden THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, 'Someone') INTO v_author FROM public.profiles WHERE user_id = NEW.author_id;
  INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
  SELECT f.follower_id, 'post', v_author || ' shared a new post', LEFT(COALESCE(NEW.body, '📷 Photo'), 200),
         '/community', jsonb_build_object('post_id', NEW.id)
  FROM public.follows f
  WHERE f.following_id = NEW.author_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_followers_new_post
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_followers_new_post();

-- 9. Notification trigger for follows
CREATE OR REPLACE FUNCTION public.tg_notify_new_follower()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_follower text;
BEGIN
  SELECT COALESCE(display_name, 'Someone') INTO v_follower FROM public.profiles WHERE user_id = NEW.follower_id;
  INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
  VALUES (NEW.following_id, 'follow', v_follower || ' started following you', NULL,
          '/profile/' || NEW.follower_id::text,
          jsonb_build_object('follower_id', NEW.follower_id));
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_new_follower
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_follower();