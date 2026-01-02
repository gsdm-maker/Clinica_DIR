-- =============================================
-- Migración: Restablecer Contraseña (Admin Reset)
-- =============================================

-- Función para que un Administrador restablezca la contraseña de un usuario
-- Esto es útil cuando un usuario olvida su contraseña.
-- 1. Cambia la contraseña en auth.users
-- 2. Obliga al usuario a cambiarla de nuevo en el próximo login (must_change_password = true)

CREATE OR REPLACE FUNCTION admin_reset_password(
    target_user_id uuid,
    new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encrypted_pw text;
BEGIN
  -- 1. Verificar que quien ejecuta es Admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden restablecer contraseñas.';
  END IF;

  encrypted_pw := crypt(new_password, gen_salt('bf'));

  -- 2. Actualizar contraseña en auth.users
  UPDATE auth.users
  SET encrypted_password = encrypted_pw,
      updated_at = now()
  WHERE id = target_user_id;

  -- 3. Marcar que debe cambiar contraseña obligatoriamente
  UPDATE public.users
  SET must_change_password = TRUE,
      updated_at = now()
  WHERE id = target_user_id;

END;
$$;
