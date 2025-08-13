/*
  # Crear usuarios de prueba para el sistema

  1. Usuarios de prueba
    - Crea 5 usuarios con diferentes roles para testing
    - Cada usuario tiene credenciales específicas para pruebas
  
  2. Seguridad
    - Los usuarios se crean en auth.users (sistema de autenticación)
    - Se vinculan con la tabla public.users para información adicional
*/

-- Insertar usuarios en auth.users (sistema de autenticación de Supabase)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES 
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@hospital.cl',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Administrador Sistema"}',
  false,
  'authenticated'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'bodega@hospital.cl',
  crypt('bodega123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Encargado Bodega"}',
  false,
  'authenticated'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'auditor@hospital.cl',
  crypt('auditor123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Auditor Interno"}',
  false,
  'authenticated'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'enfermero@hospital.cl',
  crypt('enfermero123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Enfermero Jefe"}',
  false,
  'authenticated'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'viewer@hospital.cl',
  crypt('viewer123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Visualizador"}',
  false,
  'authenticated'
);

-- Insertar usuarios en la tabla public.users
INSERT INTO public.users (id, email, name, role, created_at) 
SELECT 
  au.id,
  au.email,
  (au.raw_user_meta_data->>'name')::text,
  CASE 
    WHEN au.email = 'admin@hospital.cl' THEN 'admin'
    WHEN au.email = 'bodega@hospital.cl' THEN 'bodega'
    WHEN au.email = 'auditor@hospital.cl' THEN 'auditor'
    WHEN au.email = 'enfermero@hospital.cl' THEN 'enfermero'
    WHEN au.email = 'viewer@hospital.cl' THEN 'visualizador'
  END::text,
  au.created_at
FROM auth.users au
WHERE au.email IN (
  'admin@hospital.cl',
  'bodega@hospital.cl', 
  'auditor@hospital.cl',
  'enfermero@hospital.cl',
  'viewer@hospital.cl'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role;