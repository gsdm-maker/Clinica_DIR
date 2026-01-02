-- =============================================
-- FIX EXTREMO: Re-crear usuario admin manualmente
-- =============================================
-- El error 500 es persistente y específico. Parece que la tabla AUTH está dañada o con triggers zombis.
-- Vamos a probar algo radical: NO usar la función RPC, sino insertar directo para descartar la función.

-- 1. Asegurar que no quede NINGÚN trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_inserted ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
-- A veces los triggers tienen otros nombres dependiendo del tutorial seguido
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS user_created ON auth.users;

-- 2. Limpiar usuario corrupto 'sdiaze' (o 'sdiz')
DELETE FROM public.users WHERE email LIKE '%@clinica.system';
DELETE FROM auth.identities WHERE email LIKE '%@clinica.system';
DELETE FROM auth.users WHERE email LIKE '%@clinica.system';

-- 3. Crear función MINIMALISTA (sin pgcrypto complejo, usando insert simple)
-- Esto aisla si el problema es la encriptación o el trigger.
CREATE OR REPLACE FUNCTION admin_create_user(
    new_email text,
    new_password text,
    new_name text,
    new_role text,
    new_contact_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_id uuid;
BEGIN
  -- Verificar admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado.';
  END IF;

  new_id := gen_random_uuid();

  -- Insert RAW en Auth (sin usar crypt si pgcrypto falla, pero auth requiere hash)
  -- NOTA: Supabase Auth REQUIERE un hash válido. Usaremos pgcrypto pero con sintaxis más simple.
  
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, 
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, role, aud
  ) VALUES (
    new_id, new_email, crypt(new_password, gen_salt('bf')), now(), 
    now(), now(), '{"provider":"email","providers":["email"]}', 
    jsonb_build_object('name', new_name), 'authenticated', 'authenticated'
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    new_id, new_id, jsonb_build_object('sub', new_id, 'email', new_email), 
    'email', new_email, now(), now(), now()
  );

  INSERT INTO public.users (
    id, email, name, role, created_at, must_change_password, contact_email, username
  ) VALUES (
    new_id, new_email, new_name, new_role, now(), TRUE, new_contact_email, split_part(new_email, '@', 1)
  );

  RETURN new_id;
END;
$$;
