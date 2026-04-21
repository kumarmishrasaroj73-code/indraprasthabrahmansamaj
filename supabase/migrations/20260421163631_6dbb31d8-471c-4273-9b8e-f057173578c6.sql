
-- Fix function search_path
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- Remove broad listing policies (files still served via public bucket URLs)
DROP POLICY IF EXISTS "Public can view community photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view notice attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view notice attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public read notice attachments" ON storage.objects;
