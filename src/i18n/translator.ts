// Centralized client-side translator with localStorage cache.
// Calls the `translate` edge function in batches with debouncing.

import { supabase } from "@/integrations/supabase/client";

const LS_PREFIX = "tx_v1::"; // tx_v1::<lang>::<sha1>
const MEM: Map<string, string> = new Map();

async function sha1(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function lsKey(lang: string, hash: string) {
  return `${LS_PREFIX}${lang}::${hash}`;
}

function getCached(lang: string, hash: string): string | null {
  const k = lsKey(lang, hash);
  if (MEM.has(k)) return MEM.get(k)!;
  try {
    const v = localStorage.getItem(k);
    if (v !== null) MEM.set(k, v);
    return v;
  } catch {
    return null;
  }
}

function setCached(lang: string, hash: string, value: string) {
  const k = lsKey(lang, hash);
  MEM.set(k, value);
  try { localStorage.setItem(k, value); } catch { /* quota */ }
}

// Debounced batching across the app
type PendingItem = {
  text: string;
  resolve: (v: string) => void;
};

// Simpler approach: keep a mutable batch keyed per lang
const batches: Map<string, { text: string; resolve: (v: string) => void }[]> = new Map();
let timer: number | null = null;

function schedule() {
  if (timer !== null) return;
  timer = window.setTimeout(runBatches, 80);
}

async function runBatches() {
  timer = null;
  const snapshot = new Map(batches);
  batches.clear();

  for (const [lang, items] of snapshot) {
    if (items.length === 0) continue;
    // De-dupe
    const uniqueTexts = Array.from(new Set(items.map((i) => i.text)));
    try {
      const { data, error } = await supabase.functions.invoke("translate", {
        body: { texts: uniqueTexts, target: lang },
      });
      if (error) throw error;
      const translations: string[] = data?.translations ?? uniqueTexts;
      const map = new Map<string, string>();
      uniqueTexts.forEach((t, i) => map.set(t, translations[i] ?? t));
      // Cache + resolve
      await Promise.all(uniqueTexts.map(async (t) => {
        const h = await sha1(t);
        setCached(lang, h, map.get(t)!);
      }));
      items.forEach((it) => it.resolve(map.get(it.text) ?? it.text));
    } catch (e) {
      console.error("translate batch failed", e);
      items.forEach((it) => it.resolve(it.text));
    }
  }
}

export async function translateText(text: string, lang: string): Promise<string> {
  if (!text || !text.trim()) return text;
  if (!lang || lang === "en") return text;

  const hash = await sha1(text);
  const cached = getCached(lang, hash);
  if (cached !== null) return cached;

  return new Promise<string>((resolve) => {
    if (!batches.has(lang)) batches.set(lang, []);
    batches.get(lang)!.push({ text, resolve });
    schedule();
  });
}

export async function translateMany(texts: string[], lang: string): Promise<string[]> {
  return Promise.all(texts.map((t) => translateText(t, lang)));
}

export function getCachedSync(text: string, lang: string): string | null {
  if (!text || lang === "en") return text;
  // best-effort sync lookup using memory only (no async sha1)
  // returns null if not warmed
  for (const [k, v] of MEM) {
    if (k.startsWith(`${LS_PREFIX}${lang}::`) && v === text) return v;
  }
  return null;
}
