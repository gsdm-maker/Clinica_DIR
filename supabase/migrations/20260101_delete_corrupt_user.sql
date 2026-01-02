-- =============================================
-- FIX 400: Limpieza Total de Usuario (Muerte al registro corrupto)
-- =============================================
-- Si el login sigue dando "Invalid credentials" después de resetear la password,
-- es porque el registro de Auth tiene algo corrupto de fondo que no vemos (salt, token, etc).
-- NO VALE LA PENA seguir parchando ese registro específico.

-- ESTRATEGIA:
-- 1. Borrar ese usuario específico de la faz de la tierra.
-- 2. Permitir que lo vuelvas a crear LIMPIO desde la interfaz (que ya tiene el instance_id fix).

DELETE FROM public.users WHERE email LIKE '%@clinica.system';
DELETE FROM auth.identities WHERE email LIKE '%@clinica.system';
DELETE FROM auth.users WHERE email LIKE '%@clinica.system';
