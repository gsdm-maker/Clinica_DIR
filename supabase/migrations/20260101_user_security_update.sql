-- =============================================
-- Migración: Seguridad de Usuarios (Password Reset)
-- =============================================

-- 1. Agregar campo 'must_change_password' a la tabla users
-- Este campo indicará si el usuario debe cambiar su contraseña en el próximo inicio de sesión.
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- 2. Actualizar función de creación de usuario para establecer el flag en TRUE por defecto
CREATE OR REPLACE FUNCTION admin_create_user(
    new_email text,
    new_password text,
    new_name text,
    new_role text
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

  -- Insertar en Auth
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

  -- Insertar en Public Users con must_change_password = TRUE
  INSERT INTO public.users (
    id, email, name, role, created_at, must_change_password
  ) VALUES (
    new_id, new_email, new_name, new_role, now(), TRUE
  );

  RETURN new_id;
END;
$$;

-- 3. Función para que el usuario confirme que ha cambiado su contraseña
-- Esta función será llamada por el usuario DESPUÉS de actualizar su password exitosamente.
CREATE OR REPLACE FUNCTION confirm_password_change()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Actualizar solo el registro del usuario que llama
  UPDATE public.users
  SET must_change_password = FALSE
  WHERE id = auth.uid();
END;
$$;
