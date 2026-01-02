-- =============================================
-- Solución Error: Clave duplicada (23505) en public.users
-- =============================================
-- Este error ocurre porque probablemente existe un "Trigger" automático
-- que crea el usuario en public.users apenas se inserta en auth.users.
-- Cuando nuestra función intenta insertarlo nuevamente, choca.
-- SOLUCIÓN: Usar "ON CONFLICT DO UPDATE" para sobrescribir los datos si ya existen.

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
  -- 1. Validar duplicados por correo
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
    RAISE EXCEPTION 'El usuario "%" ya está registrado.', new_email;
  END IF;

  -- 2. Validar permisos de admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado.';
  END IF;

  new_id := gen_random_uuid();
  encrypted_pw := crypt(new_password, gen_salt('bf'));

  -- 3. Insertar Auth User (Esto podría disparar un Trigger automático)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, 
    is_super_admin, role, aud
  ) VALUES (
    new_id, '00000000-0000-0000-0000-000000000000', new_email, encrypted_pw, now(), 
    now(), now(), '{"provider": "email", "providers": ["email"]}', 
    jsonb_build_object('name', new_name), false, 'authenticated', 'authenticated'
  );

  -- 4. Insertar Identity (con el fix de provider_id)
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    new_id, new_id, jsonb_build_object('sub', new_id, 'email', new_email), 
    'email', new_email, now(), now(), now()
  );

  -- 5. Insertar en Public Users de forma segura (Upsert)
  -- Si el trigger ya lo creó, actualizamos los campos importantes (rol, password flag, contacto)
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
