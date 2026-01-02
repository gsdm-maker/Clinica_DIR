-- =============================================
-- SYNC USERNAME (Backfill)
-- =============================================
-- Si el 'username' quedó vacío en la BD, lo rellenamos desde el email.

UPDATE public.users
SET username = split_part(email, '@', 1)
WHERE username IS NULL OR username = '';

-- Verificación visual de que funcionó
SELECT email, username FROM public.users;
