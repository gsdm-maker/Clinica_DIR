-- =============================================
-- Solución Error Columna Generada (confirmed_at)
-- =============================================

-- Error 428C9: No podemos actualizar 'confirmed_at' manualmente porque es generada.
-- Solución: Solo actualizamos 'email_confirmed_at', que es la que importa para el login.

UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_token = '',
  recovery_token = '',
  is_super_admin = false,
  -- confirmed_at = COALESCE(confirmed_at, now()),  <-- ELIMINADA LINEA PROBLEMÁTICA
  last_sign_in_at = now(),
  raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb,
  raw_user_meta_data = jsonb_build_object('name', 'Usuario Reparado'),
  aud = 'authenticated',
  role = 'authenticated'
WHERE email LIKE '%@clinica.system';

-- Limpieza preventiva
DELETE FROM auth.identities 
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE '%@clinica.system'
) AND provider_id != email; 
