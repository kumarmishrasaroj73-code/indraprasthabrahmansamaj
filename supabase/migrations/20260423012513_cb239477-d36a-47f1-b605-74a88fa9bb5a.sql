-- Grant admin role now to the two specified accounts (if they already exist)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) IN ('radhadarshan14@gmail.com', 'kumarmishrasaroj73@gmail.com')
ON CONFLICT DO NOTHING;

-- Update handle_new_user so these emails are always granted admin on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)));

  IF lower(NEW.email) IN (
    'admin@indraprasthbrahmansamaj.org',
    'radhadarshan14@gmail.com',
    'kumarmishrasaroj73@gmail.com'
  ) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
      ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;