-- =============================================
-- MASTER FIX: Reparación de Auth + Columna 'Usuario' Explicita
-- =============================================

-- 1. Limpieza de Triggers que causan Error 500 / Duplicados
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_inserted ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_user_update();

-- 2. Asegurar encriptación
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;

-- 3. AGREGAR COLUMNA 'username' VISIBLE en public.users
-- Esto responde a tu necesidad de ver el usuario "sdiaze" en la tabla.
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS username TEXT;

-- 4. Rellenar la columna 'username' para usuarios existentes
-- Extrae todo lo que está antes del '@' (ej: 'sdiaze' de 'sdiaze@clinica.system')
UPDATE public.users 
SET username = split_part(email, '@', 1) 
WHERE username IS NULL;

-- 5. Función CREAR USUARIO Corregida y Mejorada
-- Ahora guarda el 'username' explícitamente en la nueva columna.
CREATE OR REPLACE FUNCTION admin_create_user(
    new_email text,         -- ej: sdiaze@clinica.system
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
  encrypted_pw text;
  real_username text;
BEGIN
  -- Validar duplicados
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
    RAISE EXCEPTION 'El usuario "%" ya está registrado.', new_email;
  END IF;

  -- Validar Admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado.';
  END IF;

  -- Extraer el usuario limpio (sdiaze) del email
  real_username := split_part(new_email, '@', 1);

  new_id := gen_random_uuid();
  encrypted_pw := crypt(new_password, gen_salt('bf', 10));

  -- Insert Auth
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, 
    is_super_admin, role, aud
  ) VALUES (
    new_id, '00000000-0000-0000-0000-000000000000', new_email, encrypted_pw, now(), 
    now(), now(), '{"provider": "email", "providers": ["email"]}', 
    jsonb_build_object('name', new_name), false, 'authenticated', 'authenticated'
  );

  -- Insert Identity
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    new_id, new_id, jsonb_build_object('sub', new_id, 'email', new_email), 
    'email', new_email, now(), now(), now()
  );

  -- Insert Public User (Guardando el USERNAME explicito)
  INSERT INTO public.users (
    id, email, name, role, created_at, must_change_password, contact_email, username
  ) VALUES (
    new_id, new_email, new_name, new_role, now(), TRUE, new_contact_email, real_username
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    contact_email = EXCLUDED.contact_email,
    username = EXCLUDED.username, -- Asegurar que se guarde el username si se re-inserta
    must_change_password = TRUE;

  RETURN new_id;
END;
$$;

-- 6. Actualizar lectura de usuarios para devolver el nuevo campo
DROP FUNCTION IF EXISTS get_users();

CREATE OR REPLACE FUNCTION get_users()
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  contact_email text,
  username text -- Nuevo campo de retorno
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pu.id,
    pu.email,
    pu.name,
    pu.role,
    pu.created_at,
    au.last_sign_in_at,
    pu.contact_email,
    pu.username
  FROM public.users pu
  JOIN auth.users au ON pu.id = au.id
  ORDER BY pu.created_at DESC;
END;
$$;
