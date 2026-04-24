// Sends a Web Push notification (VAPID) to all of a user's saved subscriptions.
// Body: { user_id: string, title: string, body?: string, link?: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.45.0/cors";
// @ts-ignore - npm specifier resolves at deploy
import webpush from "npm:web-push@3.6.7";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const PUB = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const PRIV = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const SUBJ = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

    if (!PUB || !PRIV) {
      return new Response(JSON.stringify({ error: "VAPID keys missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    webpush.setVapidDetails(SUBJ, PUB, PRIV);

    const { user_id, title, body, link } = await req.json();
    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "user_id and title required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);
    if (error) throw error;

    const payload = JSON.stringify({ title, body: body ?? "", link: link ?? "/" });
    const results = await Promise.allSettled(
      (subs ?? []).map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
      )
    );

    // Cleanup expired subscriptions
    const dead: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const status = (r.reason as any)?.statusCode;
        if (status === 404 || status === 410) dead.push(subs![i].endpoint);
      }
    });
    if (dead.length) await admin.from("push_subscriptions").delete().in("endpoint", dead);

    return new Response(
      JSON.stringify({
        ok: true,
        sent: results.filter((r) => r.status === "fulfilled").length,
        removed: dead.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
