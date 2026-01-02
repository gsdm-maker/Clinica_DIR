-- =============================================
-- Solución Definitiva Error 500 durante Login
-- =============================================
-- El error "Database error querying schema" al hacer login suele deberse a:
-- 1. Un trigger corrupto en public.users o auth.users.
-- 2. Permisos revocados accidentalmente sobre el esquema auth.

-- PASO 1: Eliminar triggers problemáticos de la tabla AUTH (otra vez, para asegurar)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_inserted ON auth.users;
DROP TRIGGER IF EXISTS mfa_factor_insert_trigger ON auth.mfa_factors;
DROP TRIGGER IF EXISTS on_sso_domain_insert ON auth.sso_domains;
DROP TRIGGER IF EXISTS on_sso_domain_update ON auth.sso_domains;

-- PASO 2: Eliminar triggers problemáticos de la tabla PUBLIC (public.users)
-- A veces hay triggers aquí que intentan escribir de vuelta en auth y fallan.
DROP TRIGGER IF EXISTS on_user_update ON public.users;
DROP TRIGGER IF EXISTS handle_updated_at ON public.users;

-- PASO 3: Asegurar permisos (GRANT) correctos
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- PASO 4: Confirmar Usuarios "Pendientes"
-- Si el usuario aparece "Pendiente" es porque 'email_confirmed_at' es NULL.
-- Forzamos la confirmación de todos los usuarios actuales.
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;

-- PASO 5: Eliminar usuarios 'rotos' para limpiar (Opcional pero recomendado para pruebas)
-- Si hay usuarios creados que dan error 500, mejor empezar de 0 en la tabla.
-- (Comenta esto si tienes datos reales importantes)
-- DELETE FROM public.users WHERE email LIKE '%@clinica.system';
-- DELETE FROM auth.identities WHERE email LIKE '%@clinica.system';
-- DELETE FROM auth.users WHERE email LIKE '%@clinica.system';
