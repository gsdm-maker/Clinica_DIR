-- =============================================
-- Migración: Agregar Email de Contacto
-- =============================================

-- 1. Agregar columna a la tabla users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- 2. Actualizar función de creación para aceptar el email de contacto
CREATE OR REPLACE FUNCTION admin_create_user(
    new_email text,         -- Email del sistema (login)
    new_password text,
    new_name text,
    new_role text,
    new_contact_email text DEFAULT NULL -- Nuevo parámetro opcional
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  encrypted_pw text;
BEGIN
  -- Verificar admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  new_id := gen_random_uuid();
  encrypted_pw := crypt(new_password, gen_salt('bf'));

  -- Insertar en Auth (Siempre usa el email del sistema para login)
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

  -- Insertar en Public Users con el email de contacto real
  INSERT INTO public.users (
    id, email, name, role, created_at, must_change_password, contact_email
  ) VALUES (
    new_id, new_email, new_name, new_role, now(), TRUE, new_contact_email
  );

  RETURN new_id;
END;
$$;

-- 3. Actualizar función get_users para devolver el email de contacto
DROP FUNCTION IF EXISTS get_users();

CREATE OR REPLACE FUNCTION get_users()
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  contact_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'anon' THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  RETURN QUERY
  SELECT 
    pu.id,
    pu.email,
    pu.name,
    pu.role,
    pu.created_at,
    au.last_sign_in_at,
    pu.contact_email
  FROM public.users pu
  JOIN auth.users au ON pu.id = au.id
  ORDER BY pu.created_at DESC;
END;
$$;
