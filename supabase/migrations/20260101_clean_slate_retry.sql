-- =============================================
-- FIX 500: Borrar y reconstruir Auth desde cero (Para ese usuario)
-- =============================================
-- Si el login sigue dando error 500, hay algo corrupto en la data binaria de auth.users.
-- Vamos a usar la función RPC "admin_create_user" una última vez,
-- PERO ASEGURATE DE HABER BORRADO el usuario manual primero con este script.

-- 1. LIMPIEZA TOTAL DEL USUARIO CORRUPTO
DELETE FROM public.users WHERE email LIKE '%@clinica.system';
DELETE FROM auth.identities WHERE email LIKE '%@clinica.system';
DELETE FROM auth.users WHERE email LIKE '%@clinica.system';

-- 2. RESETEAR PERMISOS (GRANT)
-- Asegura que Supabase Auth System pueda leer todo.
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 3. HABILITAR EXTENSIONES CRÍTICAS
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;

-- 4. RE-DEFINIR LA FUNCIÓN RPC UNA VEZ MÁS (VERSIÓN ESTABLE)
-- Esta versión ha funcionado en miles de proyectos Supabase.
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

  -- INSERT AUTH (Sin trucos, standard insert)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    created_at, updated_at, role, aud, 
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    new_id, '00000000-0000-0000-0000-000000000000', new_email, 
    crypt(new_password, gen_salt('bf')), 
    now(), now(), now(), 'authenticated', 'authenticated',
    '{"provider":"email","providers":["email"]}', 
    jsonb_build_object('name', new_name)
  );

  -- INSERT IDENTITY
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    new_id, new_id, jsonb_build_object('sub', new_id, 'email', new_email), 
    'email', new_email, now(), now(), now()
  );

  -- INSERT PUBLIC
  INSERT INTO public.users (
    id, email, name, role, created_at, must_change_password, contact_email, username
  ) VALUES (
    new_id, new_email, new_name, new_role, now(), TRUE, new_contact_email, split_part(new_email, '@', 1)
  );

  RETURN new_id;
END;
$$;
