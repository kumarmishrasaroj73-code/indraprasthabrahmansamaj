import { useEffect, useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Image as ImageIcon, Trash2, EyeOff, Send, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

type Profile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  gotra: string | null;
  city: string | null;
};

type Post = {
  id: string;
  author_id: string;
  body: string | null;
  image_url: string | null;
  is_hidden: boolean;
  created_at: string;
  author?: Profile;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
};

type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: Profile;
};

const postSchema = z.object({
  body: z.string().trim().max(4000, "Post too long"),
});

const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment is empty").max(2000, "Comment too long"),
});

const Community = () => {
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [openComments, setOpenComments] = useState<Record<string, Comment[] | undefined>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const roles = (data || []).map((r) => r.role);
        setIsModerator(roles.includes("moderator") || roles.includes("admin"));
      });
  }, [user]);

  const loadFeed = async () => {
    setLoading(true);
    const { data: rawPosts, error } = await supabase
      .from("posts")
      .select("id, author_id, body, image_url, is_hidden, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      toast({ title: "Couldn't load feed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const ids = (rawPosts || []).map((p) => p.id);
    const authorIds = Array.from(new Set((rawPosts || []).map((p) => p.author_id)));

    const [{ data: profiles }, { data: likes }, { data: comments }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, gotra, city")
        .in("user_id", authorIds.length ? authorIds : ["00000000-0000-0000-0000-000000000000"]),
      ids.length
        ? supabase.from("post_likes").select("post_id, user_id").in("post_id", ids)
        : Promise.resolve({ data: [] as { post_id: string; user_id: string }[] }),
      ids.length
        ? supabase.from("post_comments").select("post_id").in("post_id", ids).eq("is_hidden", false)
        : Promise.resolve({ data: [] as { post_id: string }[] }),
    ]);

    const profileMap = new Map<string, Profile>(
      (profiles || []).map((p) => [p.user_id, p as Profile])
    );
    const likeMap = new Map<string, { count: number; mine: boolean }>();
    (likes || []).forEach((l) => {
      const cur = likeMap.get(l.post_id) || { count: 0, mine: false };
      cur.count += 1;
      if (user && l.user_id === user.id) cur.mine = true;
      likeMap.set(l.post_id, cur);
    });
    const commentMap = new Map<string, number>();
    (comments || []).forEach((c) => commentMap.set(c.post_id, (commentMap.get(c.post_id) || 0) + 1));

    setPosts(
      (rawPosts || []).map((p) => ({
        ...p,
        author: profileMap.get(p.author_id),
        like_count: likeMap.get(p.id)?.count || 0,
        liked_by_me: likeMap.get(p.id)?.mine || false,
        comment_count: commentMap.get(p.id) || 0,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    loadFeed();
    const ch = supabase
      .channel("community-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => loadFeed())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleSubmitPost = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = postSchema.safeParse({ body });
    if (!parsed.success) {
      toast({ title: "Invalid post", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    if (!body.trim() && !imageFile) {
      toast({ title: "Add some text or a photo first", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    let image_url: string | null = null;
    try {
      if (imageFile) {
        if (imageFile.size > 8 * 1024 * 1024) {
          throw new Error("Image must be under 8 MB");
        }
        const ext = imageFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("community-photos")
          .upload(path, imageFile, { upsert: false, contentType: imageFile.type });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("community-photos").getPublicUrl(path);
        image_url = data.publicUrl;
      }
      const { error } = await supabase.from("posts").insert({
        author_id: user.id,
        body: body.trim() || null,
        image_url,
      });
      if (error) throw error;
      setBody("");
      setImageFile(null);
      await loadFeed();
      toast({ title: "Posted to the community" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to post";
      toast({
        title: "Couldn't post",
        description: msg.includes("approved") || msg.includes("policy")
          ? "Only approved members can post. Please complete your registration."
          : msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = async (post: Post) => {
    if (!user) return;
    if (post.liked_by_me) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              liked_by_me: !post.liked_by_me,
              like_count: post.like_count + (post.liked_by_me ? -1 : 1),
            }
          : p
      )
    );
  };

  const loadComments = async (postId: string) => {
    if (openComments[postId] !== undefined) {
      setOpenComments((prev) => ({ ...prev, [postId]: undefined }));
      return;
    }
    const { data } = await supabase
      .from("post_comments")
      .select("id, post_id, author_id, body, created_at")
      .eq("post_id", postId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true });
    const authorIds = Array.from(new Set((data || []).map((c) => c.author_id)));
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, gotra, city")
      .in("user_id", authorIds.length ? authorIds : ["00000000-0000-0000-0000-000000000000"]);
    const profMap = new Map<string, Profile>((profs || []).map((p) => [p.user_id, p as Profile]));
    setOpenComments((prev) => ({
      ...prev,
      [postId]: (data || []).map((c) => ({ ...c, author: profMap.get(c.author_id) })),
    }));
  };

  const submitComment = async (postId: string) => {
    if (!user) return;
    const draft = commentDrafts[postId] || "";
    const parsed = commentSchema.safeParse({ body: draft });
    if (!parsed.success) {
      toast({ title: "Invalid comment", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      author_id: user.id,
      body: draft.trim(),
    });
    if (error) {
      toast({
        title: "Couldn't comment",
        description: error.message.includes("policy")
          ? "Only approved members can comment."
          : error.message,
        variant: "destructive",
      });
      return;
    }
    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p)));
    // refresh
    setOpenComments((prev) => ({ ...prev, [postId]: undefined }));
    await loadComments(postId);
  };

  const hidePost = async (postId: string) => {
    const { error } = await supabase.from("posts").update({ is_hidden: true }).eq("id", postId);
    if (error) {
      toast({ title: "Couldn't hide post", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Post hidden" });
    loadFeed();
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Delete this post permanently?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      toast({ title: "Couldn't delete post", description: error.message, variant: "destructive" });
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast({ title: "Post deleted" });
  };

  const sharePost = (post: Post) => {
    const url = `${window.location.origin}/community#${post.id}`;
    const text = `${post.author?.display_name || "Member"}: ${post.body?.slice(0, 120) || "Shared a post"}`;
    if (navigator.share) {
      navigator.share({ title: "Indraprastha Brahman Samaj", text, url }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");
    }
  };

  if (!user) {
    return (
      <div className="container py-16 text-center">
        <h1 className="font-serif text-3xl font-bold text-secondary mb-3">Community Feed</h1>
        <p className="text-muted-foreground mb-6">Sign in to view and share posts with the Samaj.</p>
        <Button asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-6 md:py-10">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-secondary">Community</h1>
        <p className="text-sm text-muted-foreground">Share updates, photos and announcements with the Samaj.</p>
      </header>

      <Card className="mb-6 border-accent/40">
        <form onSubmit={handleSubmitPost}>
          <CardContent className="p-4 space-y-3">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's on your mind?"
              rows={3}
              maxLength={4000}
              className="resize-none"
            />
            {imageFile && (
              <div className="text-xs text-muted-foreground flex items-center justify-between bg-muted rounded px-3 py-2">
                <span>📷 {imageFile.name}</span>
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  className="text-destructive hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <label className="cursor-pointer text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                <span>Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </label>
              <Button type="submit" disabled={submitting} size="sm">
                {submitting ? "Posting…" : "Post"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No posts yet. Be the first to share something!
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const initials = (post.author?.display_name || "U")
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            const comments = openComments[post.id];
            return (
              <Card
                key={post.id}
                id={post.id}
                className={`border-accent/30 ${post.is_hidden ? "opacity-60" : ""}`}
              >
                <CardHeader className="p-4 pb-2 flex-row items-center gap-3 space-y-0">
                  <Link to={`/profile/${post.author_id}`}>
                    <Avatar className="h-10 w-10 ring-1 ring-accent">
                      <AvatarImage src={post.author?.avatar_url || undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/profile/${post.author_id}`}
                      className="font-medium text-sm hover:text-primary block truncate"
                    >
                      {post.author?.display_name || "Member"}
                    </Link>
                    <div className="text-xs text-muted-foreground truncate">
                      {[post.author?.gotra && `Gotra: ${post.author.gotra}`, post.author?.city]
                        .filter(Boolean)
                        .join(" · ")}
                      {" · "}
                      {new Date(post.created_at).toLocaleString()}
                    </div>
                  </div>
                  {(isModerator || post.author_id === user.id) && (
                    <div className="flex items-center gap-1">
                      {isModerator && !post.is_hidden && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => hidePost(post.id)}
                          title="Hide post"
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      )}
                      {(isAdmin || post.author_id === user.id) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deletePost(post.id)}
                          title="Delete post"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {post.body && (
                    <p className="whitespace-pre-line text-sm leading-relaxed mb-3">{post.body}</p>
                  )}
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post"
                      loading="lazy"
                      className="rounded-lg w-full max-h-[480px] object-cover border border-border"
                    />
                  )}
                  <div className="flex items-center gap-1 mt-3 -ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleLike(post)}
                      className={post.liked_by_me ? "text-primary" : ""}
                    >
                      <Heart
                        className={`h-4 w-4 mr-1.5 ${post.liked_by_me ? "fill-primary" : ""}`}
                      />
                      {post.like_count}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => loadComments(post.id)}>
                      <MessageCircle className="h-4 w-4 mr-1.5" />
                      {post.comment_count}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => sharePost(post)}>
                      <Share2 className="h-4 w-4 mr-1.5" />
                      Share
                    </Button>
                  </div>

                  {comments !== undefined && (
                    <div className="mt-3 pt-3 border-t border-border space-y-3">
                      {comments.map((c) => {
                        const cInit = (c.author?.display_name || "U")
                          .split(" ")
                          .map((s) => s[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase();
                        return (
                          <div key={c.id} className="flex gap-2 items-start">
                            <Link to={`/profile/${c.author_id}`}>
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={c.author?.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px]">{cInit}</AvatarFallback>
                              </Avatar>
                            </Link>
                            <div className="flex-1 bg-muted rounded-lg px-3 py-2">
                              <Link
                                to={`/profile/${c.author_id}`}
                                className="text-xs font-medium hover:text-primary"
                              >
                                {c.author?.display_name || "Member"}
                              </Link>
                              <p className="text-sm whitespace-pre-line">{c.body}</p>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex gap-2">
                        <Input
                          value={commentDrafts[post.id] || ""}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          placeholder="Write a comment…"
                          maxLength={2000}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              submitComment(post.id);
                            }
                          }}
                        />
                        <Button size="icon" onClick={() => submitComment(post.id)}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Community;
