// Translate batches of strings via Lovable AI Gateway with DB caching.
// Public endpoint (verify_jwt = false) so any visitor can fetch translations.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const LANG_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", sa: "Sanskrit", bn: "Bengali", mr: "Marathi",
  gu: "Gujarati", ta: "Tamil", te: "Telugu", kn: "Kannada", ml: "Malayalam",
  pa: "Punjabi", or: "Odia", as: "Assamese", ur: "Urdu", ne: "Nepali",
  kok: "Konkani", mai: "Maithili", sd: "Sindhi", ks: "Kashmiri", doi: "Dogri",
  mni: "Manipuri (Meitei)", brx: "Bodo", sat: "Santali", tcy: "Tulu",
  bho: "Bhojpuri", awa: "Awadhi", mag: "Magahi", raj: "Rajasthani",
  bgc: "Haryanvi", gbm: "Garhwali",
};

async function sha1(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { texts, target } = await req.json() as { texts: string[]; target: string };
    if (!Array.isArray(texts) || !target) {
      return new Response(JSON.stringify({ error: "texts[] and target required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (target === "en") {
      return new Response(JSON.stringify({ translations: texts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langName = LANG_NAMES[target] ?? target;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Compute hashes & lookup cache
    const hashes = await Promise.all(texts.map(sha1));
    const { data: cached } = await supabase
      .from("translation_cache")
      .select("source_hash, translated_text")
      .eq("target_lang", target)
      .in("source_hash", hashes);

    const cacheMap = new Map<string, string>();
    (cached ?? []).forEach((r: any) => cacheMap.set(r.source_hash, r.translated_text));

    const missingIdx: number[] = [];
    hashes.forEach((h, i) => { if (!cacheMap.has(h)) missingIdx.push(i); });

    let newTranslations: string[] = [];
    if (missingIdx.length > 0) {
      const toTranslate = missingIdx.map((i) => texts[i]);

      // Use tool calling for reliable structured output
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a professional translator for an Indian community website (Indraprastha Brahman Samaj). Translate the given UI strings/content from English to ${langName}. Preserve placeholders like {{name}}, line breaks, punctuation, emojis, and Sanskrit ślokas (text in Devanagari between ॥). Keep proper nouns (Indraprastha, Brahman, Samaj, UPI, PhonePe, BHIM, Stripe, IFSC, PDF) untranslated. Return ONLY the translations array in the same order, same length.`,
            },
            { role: "user", content: JSON.stringify({ strings: toTranslate }) },
          ],
          tools: [{
            type: "function",
            function: {
              name: "return_translations",
              description: "Return translated strings in same order.",
              parameters: {
                type: "object",
                properties: {
                  translations: { type: "array", items: { type: "string" } },
                },
                required: ["translations"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "return_translations" } },
        }),
      });

      if (!aiResp.ok) {
        const errText = await aiResp.text();
        console.error("AI gateway error", aiResp.status, errText);
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit, try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (aiResp.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // Fallback: return originals so UI still renders
        newTranslations = toTranslate;
      } else {
        const data = await aiResp.json();
        const call = data.choices?.[0]?.message?.tool_calls?.[0];
        try {
          const args = JSON.parse(call?.function?.arguments ?? "{}");
          newTranslations = Array.isArray(args.translations) ? args.translations : toTranslate;
          if (newTranslations.length !== toTranslate.length) newTranslations = toTranslate;
        } catch {
          newTranslations = toTranslate;
        }
      }

      // Persist new translations (best-effort)
      const rows = missingIdx.map((origIdx, k) => ({
        source_hash: hashes[origIdx],
        target_lang: target,
        source_text: texts[origIdx],
        translated_text: newTranslations[k] ?? texts[origIdx],
      }));
      if (rows.length > 0) {
        await supabase.from("translation_cache").upsert(rows, {
          onConflict: "source_hash,target_lang",
          ignoreDuplicates: true,
        });
      }
      missingIdx.forEach((origIdx, k) => {
        cacheMap.set(hashes[origIdx], newTranslations[k] ?? texts[origIdx]);
      });
    }

    const translations = hashes.map((h, i) => cacheMap.get(h) ?? texts[i]);
    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
