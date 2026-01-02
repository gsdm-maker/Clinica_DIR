-- =============================================
-- SCRIPT DE DIAGNÓSTICO PROFUNDO
-- =============================================
-- Ejecuta esto en el SQL Editor de Supabase y COMPARTE LOS RESULTADOS (o pantallazo).

-- 1. VER TRIGGERS ACTIVOS (El principal sospechoso)
-- Esto nos dirá si hay algún trigger oculto en 'auth.users' o 'public.users' 
-- que se nos haya pasado por alto.
SELECT 
    event_object_schema as schema,
    event_object_table as table,
    trigger_name,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
ORDER BY event_object_schema, event_object_table;

-- 2. VER ESTADO DEL USUARIO QUE FALLA (Si existe)
-- Reemplaza el email si probaste con otro.
SELECT id, email, role, email_confirmed_at, confirmed_at, last_sign_in_at, raw_user_meta_data
FROM auth.users 
WHERE email LIKE '%@clinica.system';

-- 3. VERIFICAR COLUMNAS DE AUTH.USERS
-- Para ver si hay alguna columna nueva rara que Supabase haya agregado
-- y que estemos dejando NULL incorrectamente.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'users';

-- 4. VERIFICAR CONTENIDO DE IDENTITIES
-- A veces el error es aquí.
SELECT * FROM auth.identities WHERE email LIKE '%@clinica.system';
