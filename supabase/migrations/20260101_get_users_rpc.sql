-- =============================================
-- Migración: Función get_users (Lectura de Usuarios)
-- =============================================

-- Función para obtener la lista de usuarios combinando public.users con auth.users
-- Esto es necesario para mostrar 'last_sign_in_at' en el panel de administración.

CREATE OR REPLACE FUNCTION get_users()
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER -- Necesario para leer auth.users
SET search_path = public
AS $$
BEGIN
  -- Verificar permisos (opcional: solo permitir a admins ver esto, o dejar abierto si visualizadores también pueden ver lista)
  -- Por ahora permitimos a todos los autenticados para evitar bloquear la UI si el rol no cargó
  IF auth.role() = 'anon' THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  RETURN QUERY
  SELECT 
    pu.id,
    pu.email,
    pu.name,
    pu.role,
    pu.created_at,
    au.last_sign_in_at
  FROM public.users pu
  JOIN auth.users au ON pu.id = au.id
  ORDER BY pu.created_at DESC;
END;
$$;
