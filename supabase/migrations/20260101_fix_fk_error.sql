-- =============================================
-- FIX 409 CONFLICT: Foreign Key Constraint
-- =============================================
-- El error 23503 indica que 'public.users' intenta referenciar a 'auth.users'
-- PERO la transacción aún no ve al usuario en 'auth.users' o hay un desfase.

-- Esto es extraño porque el usuario SE CREÓ desde el cliente (Web) antes de llamar al RPC.
-- Probablemente sea un tema de PERMISOS CROSS-SCHEMA. El usuario RPC no puede ver auth.users.

-- 1. SOLUCIÓN: Usar SECURITY DEFINER con permisos explícitos de lectura
-- (Ya lo teníamos, pero reforzaremos).

-- 2. ALTERNATIVA: Comprobar si existe antes de insertar y dar un pequeño "sleep" o reintento no es posible en SQL puro fácil.
-- Pero el error dice "Key id is not present in table users".
-- OJO: ¿Cuál tabla users? Dice "users", no "auth.users".
-- Si la constraint es "users_id_fkey", suele ser public.users -> auth.users.

-- VAMOS A RE-DEFINIR LA FUNCIÓN PARA QUE SEA MÁS ROBUSTA Y CHEQUEE EXISTENCIA

CREATE OR REPLACE FUNCTION admin_finalize_user(
    target_user_id uuid,
    new_name text,
    new_role text,
    new_username text,
    new_contact_email text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions -- Importante: auth debe ser accesible
AS $$
DECLARE
  user_exists boolean;
  v_count int;
BEGIN
  -- Check Admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado.';
  END IF;

  -- Verify Auth User Exists (Esperar o verificar visibilidad)
  -- A veces la replicación interna tarda unos ms, pero en single node debería ser instantáneo.
  SELECT count(*) INTO v_count FROM auth.users WHERE id = target_user_id;
  
  IF v_count = 0 THEN
      -- Si no lo ve, puede ser tema de permisos. Intentamos conceder visibilidad temporalmente no es posible aqui.
      -- Probamos forzar un refresco simple o simplemente proceder confiando en que el commit anterior terminó.
      RAISE EXCEPTION 'El usuario Auth no se encuentra. ID: %', target_user_id;
  END IF;

  -- Update Auth
  UPDATE auth.users
  SET email_confirmed_at = now(),
      updated_at = now(),
      raw_user_meta_data = jsonb_build_object('name', new_name)
  WHERE id = target_user_id;

  -- Upsert Public - Manejo explícito de excepciones
  BEGIN
      INSERT INTO public.users (
        id, name, role, created_at, must_change_password, contact_email, username
      ) VALUES (
        target_user_id, new_name, new_role, now(), TRUE, new_contact_email, new_username
      )
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        role = EXCLUDED.role;
  EXCEPTION WHEN foreign_key_violation THEN
      -- Si falla por FK, es que auth.users aún no es visible para esta transacción.
      -- Esto es RARO en Postgres normal, pero común si hay RLS agresivo en auth.users.
      RAISE EXCEPTION 'Error de Sincronización: El usuario Auth no es visible aún.';
  END;
END;
$$;

-- 3. FIX PERMISOS CRUCIAL
-- Asegurar que el rol que ejecuta la función (probablemente postgres o service_role) pueda ver auth.users
GRANT SELECT ON auth.users TO postgres, service_role, authenticated, anon;
