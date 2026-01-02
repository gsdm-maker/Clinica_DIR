-- =============================================
-- Funciones RPC para Gestión de Usuarios por Admin
-- =============================================
-- Estas funciones permiten a un Administrador crear, editar y eliminar usuarios
-- manipulando directamente las tablas de auth.users y public.users.
-- Requieren permisos elevados (SECURITY DEFINER) para escribir en auth.users.

-- 1. Función para Crear Usuario (Admin)
CREATE OR REPLACE FUNCTION admin_create_user(
    new_email text,
    new_password text,
    new_name text,
    new_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del creador (postgres/admin)
SET search_path = public -- Seguridad: evita search_path hijacking
AS $$
DECLARE
  new_id uuid;
  encrypted_pw text;
BEGIN
  -- Verificar que el ejecutor sea admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden crear usuarios.';
  END IF;

  -- Generar ID y hash de contraseña
  new_id := gen_random_uuid();
  encrypted_pw := crypt(new_password, gen_salt('bf'));

  -- 1. Insertar en auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  ) VALUES (
    new_id,
    '00000000-0000-0000-0000-000000000000', -- instance_id default
    new_email,
    encrypted_pw,
    now(), -- Auto-confirmar email
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('name', new_name),
    false,
    'authenticated',
    'authenticated'
  );

  -- 2. Insertar una identidad (necesario para login en algunos contextos)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    new_id,
    new_id,
    jsonb_build_object('sub', new_id, 'email', new_email),
    'email',
    now(),
    now(),
    now()
  );

  -- 3. Insertar en public.users (Perfil público)
  -- Nota: Normalmente un trigger lo haría, pero aquí aseguramos el rol
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    created_at
  ) VALUES (
    new_id,
    new_email,
    new_name,
    new_role,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET role = new_role, name = new_name;

  RETURN new_id;
END;
$$;

-- 2. Función para Actualizar Rol (Admin Update)
CREATE OR REPLACE FUNCTION admin_update_user_role(
    target_user_id uuid,
    new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  -- Actualizar public.users
  UPDATE public.users
  SET role = new_role, updated_at = now()
  WHERE id = target_user_id;
END;
$$;

-- 3. Función para Eliminar Usuario (Admin Delete)
CREATE OR REPLACE FUNCTION admin_delete_user(
    target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  -- Eliminar de auth.users (cascada eliminará de public.users si está configurado, 
  -- pero como public.users es tabla independiente vinculada por FK ON DELETE CASCADE,
  -- borrar auth.users debería ser suficiente).
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
