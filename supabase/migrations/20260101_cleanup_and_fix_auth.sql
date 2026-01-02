-- =============================================
-- MIGRACIÓN DE LIMPIEZA Y REPARACIÓN
-- =============================================
-- Objetivo: Eliminar triggers problemáticos y asegurar acceso a extensiones.

-- 1. Asegurar extensión pgcrypto y permisos
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Eliminar Triggers automáticos que pueden causar conflictos (Duplicados o Error 500)
-- Intentamos borrar los nombres más comunes generados por tutoriales de Supabase.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_inserted ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- 2.1 Borrar funciones asociadas si es necesario (opcional, para limpiar)
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_user_update();

-- 3. Re-definir la función create_user asegurando que la contraseña sea compatible
-- Nota: 'bf' (Blowfish/Bcrypt) es el estándar de Supabase.
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
  encrypted_pw text;
BEGIN
  -- Validar duplicados
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
    RAISE EXCEPTION 'El usuario "%" ya está registrado.', new_email;
  END IF;

  -- Validar admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado.';
  END IF;

  new_id := gen_random_uuid();
  encrypted_pw := crypt(new_password, gen_salt('bf', 10)); -- Factor cost 10 estándar

  -- Insertar Auth
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, 
    is_super_admin, role, aud
  ) VALUES (
    new_id, '00000000-0000-0000-0000-000000000000', new_email, encrypted_pw, now(), 
    now(), now(), '{"provider": "email", "providers": ["email"]}', 
    jsonb_build_object('name', new_name), false, 'authenticated', 'authenticated'
  );

  -- Insertar Identity
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    new_id, new_id, jsonb_build_object('sub', new_id, 'email', new_email), 
    'email', new_email, now(), now(), now()
  );

  -- Insertar Public Users (Ya sin miedo a triggers duplicados)
  INSERT INTO public.users (
    id, email, name, role, created_at, must_change_password, contact_email
  ) VALUES (
    new_id, new_email, new_name, new_role, now(), TRUE, new_contact_email
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    contact_email = EXCLUDED.contact_email,
    must_change_password = TRUE;

  RETURN new_id;
END;
$$;
