CREATE TABLE IF NOT EXISTS public.translation_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_hash text NOT NULL,
  target_lang text NOT NULL,
  source_text text NOT NULL,
  translated_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_hash, target_lang)
);

CREATE INDEX IF NOT EXISTS idx_translation_cache_lookup
  ON public.translation_cache (target_lang, source_hash);

ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Translations are public readable"
  ON public.translation_cache
  FOR SELECT
  USING (true);
