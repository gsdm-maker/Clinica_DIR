-- =============================================
-- FIX USERNAME NOT SAVING
-- =============================================
-- Al parecer el parámetro 'new_username' no se estaba guardando correctamente
-- si el usuario ya existía (por trigger automático) o había un conflicto de nombres.
-- Vamos a forzar la actualización explícita.

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
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado.';
  END IF;

  -- 1. Confirmar Auth User
  UPDATE auth.users
  SET email_confirmed_at = now(),
      updated_at = now(),
      raw_user_meta_data = jsonb_build_object('name', new_name)
  WHERE id = target_user_id;

  -- 2. Upsert Public User (Forzando username)
  INSERT INTO public.users (
    id, name, role, created_at, must_change_password, contact_email, username
  ) VALUES (
    target_user_id, 
    new_name, 
    new_role, 
    now(), 
    TRUE, 
    new_contact_email, 
    new_username  -- <--- Aseguramos que entre aquí
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    contact_email = EXCLUDED.contact_email,
    username = EXCLUDED.username, -- <--- Y aquí también
    must_change_password = TRUE;

END;
$$;
