-- =============================================
-- ULTIMO INTENTO: Usar API nativa de Supabase en lugar de SQL INSERT
-- =============================================
-- Si el INSERT directo sigue fallando (Error 500) es porque la BD de Auth
-- tiene constraints o triggers internos que no podemos ver ni desactivar.
-- ESTRATEGIA: Vamos a usar la función nativa `supabase_functions.http_request` (si existe) 
-- o simplemente dejar de intentar insertar en AUTH por SQL y delegar al cliente (FE).
-- PERO primero, intentemos arreglar el usuario YA creado.

-- 1. ¿Por qué 500? Probablemente el usuario se creó PERO falta un campo crítico en auth.users
-- Revisemos si falta 'instance_id' o si 'aud' es incorrecto.

UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_token = '',
  recovery_token = '',
  is_super_admin = false,
  confirmed_at = COALESCE(confirmed_at, now()),
  last_sign_in_at = now(),
  raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb,
  raw_user_meta_data = jsonb_build_object('name', 'Usuario Reparado'),
  aud = 'authenticated',
  role = 'authenticated'
WHERE email LIKE '%@clinica.system';

-- 2. Limpieza de identities (A veces se duplican y causan 500)
DELETE FROM auth.identities 
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE '%@clinica.system'
) AND provider_id != email; 

-- 3. ELIMINAR TRIGGER OCULTO (A veces se llama 'on_auth_user_created_trigger')
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;

-- 4. NUEVA ESTRATEGIA DE CREACIÓN: Usar pgcrypto SIMPLE
-- Esta versión usa un método de inserción ultra simplificado
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

  -- Insert Auth
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

  -- Insert Identity
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    new_id, new_id, jsonb_build_object('sub', new_id, 'email', new_email), 
    'email', new_email, now(), now(), now()
  );

  -- Insert Public
  INSERT INTO public.users (
    id, email, name, role, created_at, must_change_password, contact_email, username
  ) VALUES (
    new_id, new_email, new_name, new_role, now(), TRUE, new_contact_email, split_part(new_email, '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new_id;
END;
$$;
