-- =============================================
-- Solución Definitiva: Error Pendiente (Invalid Login)
-- =============================================
-- El usuario aparece como PENDIENTE, lo que bloquea el login (Invalid credentials).
-- Supabase Auth por defecto NO deja loguear si email_confirmed_at es NULL.
-- Nuestra función anterior confirmaba con now(), pero algo está fallando o el servidor requiere confirm explicit.

-- 1. Actualizar la función para usar `confirmed_at` EXPLICITO en el INSERT
-- Esto evita depender de triggers o updates posteriores.

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

  -- INSERT AUTH DIRECTO (Con email_confirmed_at FIJO)
  INSERT INTO auth.users (
    id, 
    instance_id, 
    email, 
    encrypted_password, 
    email_confirmed_at, -- CLAVE: Debe tener fecha para no ser "pending"
    created_at, 
    updated_at, 
    raw_app_meta_data, 
    raw_user_meta_data, 
    role, 
    aud,
    confirmation_token -- A veces necesario para que no parezca que necesita confirmación
  ) VALUES (
    new_id, 
    '00000000-0000-0000-0000-000000000000', 
    new_email, 
    crypt(new_password, gen_salt('bf')), 
    now(), -- Confirmado YA
    now(), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    jsonb_build_object('name', new_name), 
    'authenticated', 
    'authenticated',
    encode(gen_random_bytes(32), 'hex') -- Token falso para cumplir constraint
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
  )
  ON CONFLICT (id) DO UPDATE SET
    must_change_password = TRUE,
    username = EXCLUDED.username;

  RETURN new_id;
END;
$$;

-- 2. REPARAR USUARIOS EXISTENTES (Sacarlos de Pendiente)
UPDATE auth.users
SET email_confirmed_at = now(),
    updated_at = now()
WHERE email LIKE '%@clinica.system' AND email_confirmed_at IS NULL;
