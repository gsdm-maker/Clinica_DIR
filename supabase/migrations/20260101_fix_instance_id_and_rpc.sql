-- =============================================
-- FIX INSTANCE_ID (SOLUCIÓN DEFINITIVA)
-- =============================================
-- El problema confirmado es que 'admin_create_user' usaba un instance_id de prueba (0000...)
-- que es inválido en Producción. Esto rompe la autenticación interna.

-- 1. REPARAR USUARIOS EXISTENTES (Los que dan error 500)
-- Copiamos el instance_id correcto de cualquier usuario real (ej: el admin)
UPDATE auth.users
SET instance_id = (
    SELECT instance_id 
    FROM auth.users 
    WHERE instance_id != '00000000-0000-0000-0000-000000000000' 
    LIMIT 1
)
WHERE email LIKE '%@clinica.system';

-- 2. CORREGIR LA FUNCIÓN PARA SIEMPRE
-- Ahora la función obtendrá el instance_id dinámicamente del administrador que la ejecuta.
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
  v_instance_id uuid;
BEGIN
  -- Verificar admin y obtener su instance_id REAL
  SELECT instance_id INTO v_instance_id
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Si por alguna razón no lo encuentra (admin borrado?), fallback a uno válido o error
  IF v_instance_id IS NULL THEN
     -- Intentar buscar otro cualquiera válido
     SELECT instance_id INTO v_instance_id FROM auth.users WHERE instance_id != '00000000-0000-0000-0000-000000000000' LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado.';
  END IF;

  new_id := gen_random_uuid();

  -- INSERT AUTH (Usando v_instance_id correcto)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    created_at, updated_at, role, aud, 
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    new_id, 
    v_instance_id, -- <--- AQUÍ ESTÁ LA SOLUCIÓN
    new_email, 
    crypt(new_password, gen_salt('bf', 10)), 
    now(), now(), now(), 'authenticated', 'authenticated',
    '{"provider":"email","providers":["email"]}', 
    jsonb_build_object('name', new_name)
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
    username = EXCLUDED.username;

  RETURN new_id;
END;
$$;
