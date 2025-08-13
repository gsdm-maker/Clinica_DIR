
-- =============================================
-- Crear la tabla `users` pública
-- =============================================
-- Esta tabla almacena metadatos públicos de los usuarios, como el rol.
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  name text,
  role text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Políticas de seguridad para `users`
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver su propia información
CREATE POLICY "Allow users to view their own data" 
  ON public.users 
  FOR SELECT
  USING (auth.uid() = id);

-- Los administradores pueden gestionar todos los usuarios
CREATE POLICY "Allow admin to manage all users" 
  ON public.users
  FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
