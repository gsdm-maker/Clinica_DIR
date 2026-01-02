-- =============================================
-- DIAGNÓSTICO: ENCONTRAR EL 'instance_id' CORRECTO
-- =============================================
-- El error 500 probablemente ocurre porque estamos creando usuarios
-- con un 'instance_id' genérico (0000...) mientras que tu proyecto real
-- tiene un ID único. Esto confunde al servidor de Auth.

-- 1. Obtener el instance_id de un usuario que SÍ funciona (ej: admin)
SELECT id, email, instance_id 
FROM auth.users 
WHERE email NOT LIKE '%@clinica.system' 
LIMIT 5;

-- 2. Ver también los usuarios rotos para comparar
SELECT id, email, instance_id 
FROM auth.users 
WHERE email LIKE '%@clinica.system';
