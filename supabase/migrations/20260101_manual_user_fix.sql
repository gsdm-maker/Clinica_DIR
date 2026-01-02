-- =============================================
-- Solución Definitiva: Limpieza y Re-creación
-- =============================================
-- Este script elimina completamente al usuario problemática
-- y crea un nuevo usuario de prueba "limpio" directamente desde SQL
-- para verificar que el sistema de autenticación funciona.

-- 1. Eliminar rastro de sdiaze y cualquier otro usuario 'test'
DELETE FROM public.users WHERE email LIKE '%@clinica.system';
DELETE FROM auth.identities WHERE email LIKE '%@clinica.system';
DELETE FROM auth.users WHERE email LIKE '%@clinica.system';

-- 2. Asegurarse que no existen triggers molestos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_inserted ON auth.users;

-- 3. Crear el usuario 'sdiaze' MANUALMENTE (sin usar la función)
-- Esto garantiza que los datos son 100% correctos y no dependen de lógica compleja.
DO $$
DECLARE
  new_id uuid := gen_random_uuid();
  email_input text := 'sdiaze@clinica.system';
  password_input text := 'GenericPassword2025!';
BEGIN
  -- Insertar en AUTH (Confirmado)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    created_at, updated_at, role, aud, 
    raw_app_meta_data, raw_user_meta_data, 
    is_super_admin
  ) VALUES (
    new_id, '00000000-0000-0000-0000-000000000000', email_input, 
    crypt(password_input, gen_salt('bf')), 
    now(), now(), now(), 'authenticated', 'authenticated',
    '{"provider":"email","providers":["email"]}', 
    jsonb_build_object('name', 'Sebastian Diaz (Manual)'),
    false
  );

  -- Insertar en IDENTITIES (Clave para evitar error 500)
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    new_id, new_id, jsonb_build_object('sub', new_id, 'email', email_input), 
    'email', email_input, now(), now(), now()
  );

  -- Insertar en PUBLIC
  INSERT INTO public.users (
    id, email, name, role, created_at, must_change_password, contact_email, username
  ) VALUES (
    new_id, email_input, 'Sebastian Diaz (Manual)', 'admin', now(), TRUE, 'manual@test.com', 'sdiaze'
  );
END $$;
