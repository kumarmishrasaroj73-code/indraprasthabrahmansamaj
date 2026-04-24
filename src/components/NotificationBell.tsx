import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, BellRing, Megaphone, MessageCircle, Calendar, UserPlus, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

type N = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

const VAPID_PUBLIC =
  "BAuG4PmGua0O8ySHhKYo0n_ZacZ8K-3nUCHwcNZyGG07iNwTKfjsxj3Zk0_0uINWOTH71NeVOBLxsKPzDqFNVo0";

const iconFor = (k: string) => {
  switch (k) {
    case "chat":
      return MessageCircle;
    case "announcement":
      return Megaphone;
    case "meeting":
      return Calendar;
    case "registration":
      return UserPlus;
    case "matrimonial":
      return Heart;
    case "rsvp":
      return Calendar;
    default:
      return Bell;
  }
};

const urlBase64ToUint8Array = (b64: string) => {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export const NotificationBell = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const reg = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!mounted) return;
      const list = (data as N[]) ?? [];
      setItems(list);
      setUnread(list.filter((n) => !n.is_read).length);
    };
    load();

    const ch = supabase
      .channel("notif:" + user.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as N;
          setItems((prev) => [n, ...prev].slice(0, 30));
          setUnread((u) => u + 1);
          toast({ title: n.title, description: n.body ?? undefined });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [user]);

  // push opt-in state
  useEffect(() => {
    if (!user || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker.register("/sw.js").then(async (r) => {
      reg.current = r;
      const sub = await r.pushManager.getSubscription();
      setPushOn(!!sub && Notification.permission === "granted");
    });
  }, [user]);

  const togglePush = async (on: boolean) => {
    if (!user || !reg.current) return;
    try {
      if (on) {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          toast({ title: "Permission denied", variant: "destructive" });
          return;
        }
        const sub = await reg.current.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        });
        const json = sub.toJSON();
        await supabase.from("push_subscriptions").upsert(
          {
            user_id: user.id,
            endpoint: sub.endpoint,
            p256dh: json.keys?.p256dh ?? "",
            auth: json.keys?.auth ?? "",
            user_agent: navigator.userAgent,
          },
          { onConflict: "endpoint" }
        );
        setPushOn(true);
        toast({ title: "Push notifications on" });
      } else {
        const sub = await reg.current.pushManager.getSubscription();
        if (sub) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          await sub.unsubscribe();
        }
        setPushOn(false);
        toast({ title: "Push notifications off" });
      }
    } catch (e) {
      const m = e instanceof Error ? e.message : "Failed";
      toast({ title: "Push error", description: m, variant: "destructive" });
    }
  };

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  const markOne = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5 text-secondary" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 border-accent/30">
        <div className="px-4 py-3 border-b border-accent/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-primary" />
            <p className="font-serif font-semibold text-secondary">Notifications</p>
          </div>
          <Button variant="ghost" size="sm" onClick={markAllRead} disabled={unread === 0}>
            <CheckCheck className="h-4 w-4 mr-1" /> Read all
          </Button>
        </div>

        <div className="px-4 py-2 border-b border-accent/30 flex items-center justify-between bg-muted/40">
          <p className="text-xs text-muted-foreground">Browser push notifications</p>
          <Switch checked={pushOn} onCheckedChange={togglePush} />
        </div>

        <ScrollArea className="h-[360px]">
          {items.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12">
              <Bell className="h-6 w-6 mx-auto mb-2 opacity-50" />
              No notifications yet
            </div>
          ) : (
            <ul>
              {items.map((n) => {
                const Icon = iconFor(n.kind);
                const content = (
                  <div
                    className={`px-4 py-3 border-b border-accent/20 flex gap-3 hover:bg-accent/10 transition-smooth ${
                      !n.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-saffron text-primary-foreground flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${!n.is_read ? "font-semibold text-secondary" : ""} truncate`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!n.is_read && (
                      <Badge className="bg-primary text-primary-foreground text-[9px] h-fit">new</Badge>
                    )}
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        to={n.link}
                        onClick={() => {
                          markOne(n.id);
                          setOpen(false);
                        }}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => markOne(n.id)}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
