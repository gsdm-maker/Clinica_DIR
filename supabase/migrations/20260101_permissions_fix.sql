-- =============================================
-- FIX DEFINITIVO: Permisos de Auth y Schema
-- =============================================

-- El error "Database error querying schema" al hacer login suele ser
-- un problema de permisos del rol interno de Supabase (supabase_auth_admin)
-- sobre el esquema public, o triggers que fallan por permisos.

-- 1. CONCEDER PERMISOS (Fix Permisos)
-- Aseguramos que el "dueño" de Auth pueda ver el esquema Public (necesario si hay triggers cruzados)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Intentar conceder también a supabase_auth_admin (si la DB lo permite, a veces da error si no somos superuser real)
-- Lo envolvemos en un bloque DO para que no falle el script si el rol no existe.
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO supabase_auth_admin;
  END IF;
END
$$;

-- 2. LIMPIEZA TOTAL DE ROW LEVEL SECURITY (RLS) en Auth
-- A veces una política RLS mal puesta en auth.users bloquea el login
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY; 
-- (La reactivaremos bien después, primero queremos que entre).

-- 3. RE-CREAR USUARIO MANUALMENTE (Versión Final)
DELETE FROM public.users WHERE email LIKE '%@clinica.system';
DELETE FROM auth.identities WHERE email LIKE '%@clinica.system';
DELETE FROM auth.users WHERE email LIKE '%@clinica.system';

DO $$
DECLARE
  new_id uuid := gen_random_uuid();
  email_input text := 'sdiaze@clinica.system';
BEGIN
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    created_at, updated_at, role, aud, 
    raw_app_meta_data, raw_user_meta_data, 
    is_super_admin
  ) VALUES (
    new_id, '00000000-0000-0000-0000-000000000000', email_input, 
    crypt('GenericPassword2025!', gen_salt('bf', 10)), -- Cost 10 Estándar
    now(), now(), now(), 'authenticated', 'authenticated',
    '{"provider":"email","providers":["email"]}', 
    jsonb_build_object('name', 'Sebastian Diaz Fix'),
    false
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    new_id, new_id, jsonb_build_object('sub', new_id, 'email', email_input), 
    'email', email_input, now(), now(), now()
  );

  INSERT INTO public.users (
    id, email, name, role, created_at, must_change_password, contact_email, username
  ) VALUES (
    new_id, email_input, 'Sebastian Diaz Fix', 'admin', now(), TRUE, NULL, 'sdiaze'
  );
END $$;
