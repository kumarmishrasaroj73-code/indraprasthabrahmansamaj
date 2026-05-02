import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Heart, MessageCircle, UserPlus, UserCheck, Camera, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  gotra: string | null;
  profession: string | null;
  city: string | null;
};

type Post = {
  id: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
  like_count?: number;
  comment_count?: number;
};

const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Name is required").max(80),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
  gotra: z.string().trim().max(60).optional().or(z.literal("")),
  profession: z.string().trim().max(80).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
});

const Profile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const targetId = userId || user?.id;
  const isOwn = !!user && targetId === user.id;

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [iFollow, setIFollow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileRow | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!targetId) return;
    setLoading(true);
    const [{ data: prof }, { data: postsData }, { count: fCount }, { count: gCount }, { data: rel }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, bio, gotra, profession, city")
          .eq("user_id", targetId)
          .maybeSingle(),
        supabase
          .from("posts")
          .select("id, body, image_url, created_at")
          .eq("author_id", targetId)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", targetId),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", targetId),
        user
          ? supabase
              .from("follows")
              .select("id")
              .eq("follower_id", user.id)
              .eq("following_id", targetId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

    const safeProfile: ProfileRow = (prof as ProfileRow) || {
      user_id: targetId,
      display_name: null,
      avatar_url: null,
      bio: null,
      gotra: null,
      profession: null,
      city: null,
    };
    setProfile(safeProfile);
    setForm(safeProfile);
    setPosts(postsData || []);
    setFollowers(fCount || 0);
    setFollowing(gCount || 0);
    setIFollow(!!rel);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, user?.id]);

  const toggleFollow = async () => {
    if (!user || !targetId || isOwn) return;
    if (iFollow) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
      setIFollow(false);
      setFollowers((c) => Math.max(0, c - 1));
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: targetId });
      if (error) {
        toast({ title: "Couldn't follow", description: error.message, variant: "destructive" });
        return;
      }
      setIFollow(true);
      setFollowers((c) => c + 1);
    }
  };

  const handleAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 4 MB.", variant: "destructive" });
      return;
    }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("community-photos")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("community-photos").getPublicUrl(path);
    setForm((prev) => (prev ? { ...prev, avatar_url: data.publicUrl } : prev));
  };

  const saveProfile = async () => {
    if (!user || !form) return;
    const parsed = profileSchema.safeParse({
      display_name: form.display_name || "",
      bio: form.bio || "",
      gotra: form.gotra || "",
      profession: form.profession || "",
      city: form.city || "",
    });
    if (!parsed.success) {
      toast({ title: "Invalid", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      display_name: form.display_name?.trim() || null,
      bio: form.bio?.trim() || null,
      gotra: form.gotra?.trim() || null,
      profession: form.profession?.trim() || null,
      city: form.city?.trim() || null,
      avatar_url: form.avatar_url || null,
    };
    // upsert
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    const { error } = existing
      ? await supabase.from("profiles").update(payload).eq("user_id", user.id)
      : await supabase.from("profiles").insert({ ...payload, user_id: user.id });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Profile updated" });
    setEditing(false);
    load();
  };

  if (!targetId) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground mb-4">Sign in to view your profile.</p>
        <Button asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (loading || !profile || !form) {
    return (
      <div className="container max-w-3xl py-8 space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const initials = (profile.display_name || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="container max-w-3xl py-6 md:py-10">
      <Card className="border-accent/40 mb-6">
        <CardHeader className="p-6 flex-row items-start gap-5 space-y-0">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-2 ring-accent">
              <AvatarImage src={(editing ? form.avatar_url : profile.avatar_url) || undefined} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            {editing && (
              <>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-warm"
                  type="button"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])}
                />
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <Input
                value={form.display_name || ""}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="Display name"
                className="font-serif text-xl mb-2"
                maxLength={80}
              />
            ) : (
              <h1 className="font-serif text-2xl font-bold text-secondary">
                {profile.display_name || "Member"}
              </h1>
            )}
            <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span>
                <strong className="text-foreground">{followers}</strong> followers
              </span>
              <span>
                <strong className="text-foreground">{following}</strong> following
              </span>
              <span>
                <strong className="text-foreground">{posts.length}</strong> posts
              </span>
            </div>
            {!editing && (
              <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                {profile.gotra && <div>Gotra: {profile.gotra}</div>}
                {profile.profession && <div>{profile.profession}</div>}
                {profile.city && <div>{profile.city}</div>}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              {isOwn ? (
                editing ? (
                  <>
                    <Button size="sm" onClick={saveProfile} disabled={saving}>
                      <Save className="h-4 w-4 mr-1.5" />
                      {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(false);
                        setForm(profile);
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    Edit profile
                  </Button>
                )
              ) : user ? (
                <Button size="sm" onClick={toggleFollow} variant={iFollow ? "outline" : "default"}>
                  {iFollow ? (
                    <>
                      <UserCheck className="h-4 w-4 mr-1.5" /> Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-1.5" /> Follow
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        {(profile.bio || editing) && (
          <CardContent className="px-6 pb-6 pt-0">
            {editing ? (
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="gotra" className="text-xs">Gotra</Label>
                    <Input
                      id="gotra"
                      value={form.gotra || ""}
                      onChange={(e) => setForm({ ...form, gotra: e.target.value })}
                      maxLength={60}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-xs">City</Label>
                    <Input
                      id="city"
                      value={form.city || ""}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      maxLength={80}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="profession" className="text-xs">Profession</Label>
                    <Input
                      id="profession"
                      value={form.profession || ""}
                      onChange={(e) => setForm({ ...form, profession: e.target.value })}
                      maxLength={80}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="bio" className="text-xs">Bio</Label>
                  <Textarea
                    id="bio"
                    value={form.bio || ""}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    maxLength={500}
                    rows={3}
                    placeholder="A short bio…"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-line text-foreground/90">{profile.bio}</p>
            )}
          </CardContent>
        )}
      </Card>

      <h2 className="font-serif text-lg font-semibold text-secondary mb-3">Posts</h2>
      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No posts yet.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <Card key={p.id} className="border-accent/30">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-2">
                  {new Date(p.created_at).toLocaleString()}
                </div>
                {p.body && <p className="whitespace-pre-line text-sm mb-3">{p.body}</p>}
                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt=""
                    loading="lazy"
                    className="rounded-lg w-full max-h-96 object-cover border border-border"
                  />
                )}
                <Link
                  to={`/community#${p.id}`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> View in feed
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Profile;
