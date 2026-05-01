// Sends an email to configured admin recipients via Resend (gateway).
// Requires a signed-in caller. Validates and escapes user-supplied content.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const MAX_SUBJECT = 200;
const MAX_HTML = 10_000;

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // --- Auth: require a valid session ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Unauthorized" });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return json(401, { error: "Unauthorized" });
    }

    // --- Config ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ADMINS = (Deno.env.get("ADMIN_NOTIFY_EMAILS") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      return json(500, { error: "Email not configured" });
    }
    if (ADMINS.length === 0) {
      return json(200, { ok: true, skipped: "no admins" });
    }

    // --- Validate input ---
    const body = await req.json().catch(() => ({}));
    const rawSubject = typeof body.subject === "string" ? body.subject : "New activity on Samaj portal";
    const rawHtml = typeof body.html === "string" ? body.html : "<p>New activity</p>";

    const subject = escapeHtml(rawSubject.trim()).slice(0, MAX_SUBJECT);
    // Caller HTML is treated as untrusted text — escape to prevent injection.
    const safeBody = escapeHtml(rawHtml.trim()).slice(0, MAX_HTML);
    const html = `<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5"><p>${safeBody.replace(/\n/g, "<br/>")}</p></div>`;

    const r = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Samaj Portal <onboarding@resend.dev>",
        to: ADMINS,
        subject,
        html,
      }),
    });

    const data = await r.json();
    if (!r.ok) return json(r.status, { error: data });
    return json(200, { ok: true, id: data.id ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    return json(500, { error: msg });
  }
});
