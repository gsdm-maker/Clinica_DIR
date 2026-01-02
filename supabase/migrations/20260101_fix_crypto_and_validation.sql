-- =============================================
-- Solución de Error: Habilitar pgcrypto y Validación de Duplicados
-- =============================================

-- 1. Habilitar la extensión necesaria para 'gen_salt' y 'crypt'
-- Esto soluciona el error "function gen_salt(unknown) does not exist"
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Actualizar función admin_create_user con validación previa de duplicados
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
SET search_path = public, extensions -- Agregamos extensions al search_path por si acaso
AS $$
DECLARE
  new_id uuid;
  encrypted_pw text;
BEGIN
  -- A. Validar que el usuario (email interno) no exista ya
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
    RAISE EXCEPTION 'El nombre de usuario ya está en uso. Por favor elige otro.';
  END IF;

  -- B. Verificar permisos de admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado.';
  END IF;

  new_id := gen_random_uuid();
  
  -- C. Encriptar contraseña (ahora gen_salt funcionará correctamente)
  encrypted_pw := crypt(new_password, gen_salt('bf'));

  -- D. Insertar en Auth
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, 
    is_super_admin, role, aud
  ) VALUES (
    new_id, '00000000-0000-0000-0000-000000000000', new_email, encrypted_pw, now(), 
    now(), now(), '{"provider": "email", "providers": ["email"]}', 
    jsonb_build_object('name', new_name), false, 'authenticated', 'authenticated'
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    new_id, new_id, jsonb_build_object('sub', new_id, 'email', new_email), 
    'email', now(), now(), now()
  );

  -- E. Insertar en Public Users
  INSERT INTO public.users (
    id, email, name, role, created_at, must_change_password, contact_email
  ) VALUES (
    new_id, new_email, new_name, new_role, now(), TRUE, new_contact_email
  );

  RETURN new_id;
END;
$$;
