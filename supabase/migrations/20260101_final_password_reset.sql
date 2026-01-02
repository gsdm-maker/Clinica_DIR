-- =============================================
-- PASSWORD RESET FINAL (Hash Standard Supabase)
-- =============================================
-- Hemos pasado del Error 500 (Base de datos rota) al Error 400 (Credenciales inválidas).
-- ESTO ES UN GRAN AVANCE. Significa que la base de datos ya está sana y responde.
-- El error ahora es simple: El hash de la contraseña en la BD no coincide con lo que escribes.
-- Esto pasa porque al copiar y pegar scripts, el hash pudo generarse con una "salt" distinta.

-- VAMOS A RESTABLECER LA CONTRASEÑA UNA ÚLTIMA VEZ CON UN MÉTODO SEGURO.

UPDATE auth.users
SET encrypted_password = crypt('GenericPassword2025!', gen_salt('bf', 10)),
    updated_at = now()
WHERE email LIKE '%@clinica.system';

-- También aseguramos una vez más que el instance_id esté bien (por si acaso)
UPDATE auth.users
SET instance_id = (
    SELECT instance_id 
    FROM auth.users 
    WHERE instance_id != '00000000-0000-0000-0000-000000000000' 
    LIMIT 1
)
WHERE email LIKE '%@clinica.system' 
AND instance_id = '00000000-0000-0000-0000-000000000000';
