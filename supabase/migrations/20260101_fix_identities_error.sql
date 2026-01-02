-- =============================================
-- Solución Error identities (provider_id not null)
-- =============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
  encrypted_pw := crypt(new_password, gen_salt('bf'));

  -- Insertar Auth User
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, 
    is_super_admin, role, aud
  ) VALUES (
    new_id, '00000000-0000-0000-0000-000000000000', new_email, encrypted_pw, now(), 
    now(), now(), '{"provider": "email", "providers": ["email"]}', 
    jsonb_build_object('name', new_name), false, 'authenticated', 'authenticated'
  );

  -- Insertar Identity (CORREGIDO: Agregar id y provider_id explícitos)
  -- En versiones recientes de Supabase Auth, identities requiere provider_id (que es igual al email username o el sub)
  INSERT INTO auth.identities (
    id,
    user_id, 
    identity_data, 
    provider,
    provider_id, -- CAMPO QUE FALTABA
    last_sign_in_at, 
    created_at, 
    updated_at
  ) VALUES (
    new_id, -- El ID de la identidad suele ser el mismo UUID o generado
    new_id, 
    jsonb_build_object('sub', new_id, 'email', new_email), 
    'email',
    new_email,  -- Para provider 'email', el provider_id suele ser el email mismo
    now(), now(), now()
  );

  -- Insertar Public User
  INSERT INTO public.users (
    id, email, name, role, created_at, must_change_password, contact_email
  ) VALUES (
    new_id, new_email, new_name, new_role, now(), TRUE, new_contact_email
  );

  RETURN new_id;
END;
$$;
