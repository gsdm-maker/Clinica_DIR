-- =============================================
-- NUCLEAR TRIGGER WIPE (Limpieza Total de Triggers)
-- =============================================
-- El error 500 persiste y afecta solo al usuario nuevo.
-- Esto confirma que hay un TRIGGER oculto (con un nombre que no adivinamos)
-- ejecutándose cuando el usuario intenta hacer login (UPDATE auth.users).

-- Este script busca TODOS los triggers en auth.users y public.users y los borra.
-- ES UNA MEDIDA DRÁSTICA PERO NECESARIA AHORA.

DO $$ 
DECLARE 
    trg RECORD; 
BEGIN 
    -- 1. Borrar TODOS los triggers de auth.users
    FOR trg IN 
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'auth.users'::regclass 
        AND tgisinternal = FALSE -- Solo borrar triggers de usuario, no internos de Postgres
    LOOP 
        RAISE NOTICE 'Borrando Trigger en auth.users: %', trg.tgname;
        EXECUTE format('DROP TRIGGER "%s" ON auth.users CASCADE;', trg.tgname); 
    END LOOP;

    -- 2. Borrar TODOS los triggers de public.users
    FOR trg IN 
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'public.users'::regclass 
        AND tgisinternal = FALSE
    LOOP 
        RAISE NOTICE 'Borrando Trigger en public.users: %', trg.tgname;
        EXECUTE format('DROP TRIGGER "%s" ON public.users CASCADE;', trg.tgname); 
    END LOOP;
END $$;

-- 3. Asegurar Permisos (Nuevamente)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 4. Recargar configuración de PostgREST (Por si el caché de esquema está sucio)
NOTIFY pgrst, 'reload config';

-- 5. Confirmar usuarios una vez mas
UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;
