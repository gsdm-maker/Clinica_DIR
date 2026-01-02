-- =============================================
-- FIX IDENTITY CORRUPTION
-- =============================================
-- Según tu reporte, la identity EXISTE y parece correcta, PERO
-- la columna "email" dentro de la tabla identities (última fila de tu JSON)
-- NO suele existir en el esquema estándar de Supabase v2.
-- Podría ser una columna generada o residual que confunde al autenticador.

-- Además, si ejecutas esto y el login sigue fallando, probaremos
-- ACTUALIZAR MANUALLY EL PASSWORD HASH, por si 'pgcrypto' generó uno incompatible.

-- 1. Actualizar contraseña usando el algoritmo nativo de Supabase (si es posible)
-- o simplemente regenerarlo con costo 10 explícito.

UPDATE auth.users
SET encrypted_password = crypt('GenericPassword2025!', gen_salt('bf', 10)),
    email_confirmed_at = now(),
    updated_at = now()
WHERE email = 'mdiaze@clinica.system';

-- 2. Asegurar que las identidades estén limpias y linkeadas
-- A veces el identity_data queda desincronizado.
UPDATE auth.identities
SET identity_data = jsonb_build_object('sub', id, 'email', email)
WHERE email = 'mdiaze@clinica.system';

-- 3. ELIMINAR CUALQUIER OTRA IDENTIDAD DUPLICADA PARA ESE EMAIL
-- (Podría haber una vieja flotando)
DELETE FROM auth.identities 
WHERE email = 'mdiaze@clinica.system' 
AND id != (SELECT id FROM auth.users WHERE email = 'mdiaze@clinica.system');
