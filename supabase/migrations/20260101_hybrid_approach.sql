-- =============================================
-- NUEVA ESTRATEGIA: Hybrid Creation
-- =============================================
-- Vamos a dejar de crear usuarios con INSERTs crudos porque fallan (500/400).
-- Usaremos la API del cliente para crear el usuario (garantía de estructura correcta)
-- y este RPC solo se usará para "Finalizar" el usuario (asignar rol y confirmar).

-- 1. Función para finalizar usuario creado desde Client
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
SET search_path = public, extensions
AS $$
BEGIN
  -- Verificar admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado.';
  END IF;

  -- 1. Forzar confirmación del email (para que pueda entrar inmediatamente)
  UPDATE auth.users
  SET email_confirmed_at = now(),
      updated_at = now(),
      raw_user_meta_data = jsonb_build_object('name', new_name)
  WHERE id = target_user_id;

  -- 2. Insertar o Actualizar en Public Users
  -- (El trigger por defecto podría haberlo creado ya, así que usamos Upsert)
  INSERT INTO public.users (
    id, name, role, created_at, must_change_password, contact_email, username
  ) VALUES (
    target_user_id, 
    new_name, 
    new_role, 
    now(), 
    TRUE, 
    new_contact_email, 
    new_username
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    must_change_password = TRUE,
    contact_email = EXCLUDED.contact_email,
    username = EXCLUDED.username;

END;
$$;
