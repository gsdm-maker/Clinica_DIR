
/*
  # Refinar Políticas de Seguridad a Nivel de Fila (RLS)

  Este script ajusta los permisos para las tablas `productos` y `movimientos`
  basándose en los roles de usuario definidos.

  ## Tablas y Roles:
  - **productos**:
    - LECTURA: Todos los usuarios autenticados.
    - GESTIÓN (CRUD): Solo `admin` y `bodega`.
  - **movimientos**:
    - LECTURA: Todos los usuarios autenticados.
    - INSERCIÓN: `admin`, `bodega`, `enfermero`.
    - GESTIÓN (UPDATE/DELETE): Solo `admin`.
*/

-- =============================================
-- Políticas para la tabla `productos`
-- =============================================

-- 1. Reiniciar políticas existentes para una configuración limpia
DROP POLICY IF EXISTS "Permitir lectura a todos" ON public.productos;
DROP POLICY IF EXISTS "Permitir escritura a bodega y admin" ON public.productos;
DROP POLICY IF EXISTS "Permitir lectura a usuarios autenticados" ON public.productos;
DROP POLICY IF EXISTS "Permitir gestion total a admin y bodega" ON public.productos;

-- 2. Política de LECTURA (SELECT)
-- Permite a cualquier usuario autenticado leer la lista de productos.
CREATE POLICY "Permitir lectura a usuarios autenticados"
  ON public.productos
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Política de GESTIÓN (INSERT, UPDATE, DELETE)
-- Permite a los roles 'admin' y 'bodega' gestionar los productos.
CREATE POLICY "Permitir gestion total a admin y bodega"
  ON public.productos
  FOR ALL -- Cubre INSERT, UPDATE, DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'bodega')
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'bodega')
  );


-- =============================================
-- Políticas para la tabla `movimientos`
-- =============================================

-- 1. Reiniciar políticas existentes
DROP POLICY IF EXISTS "Permitir lectura a todos" ON public.movimientos;
DROP POLICY IF EXISTS "Permitir escritura a usuarios autenticados" ON public.movimientos;
DROP POLICY IF EXISTS "Permitir lectura a usuarios autenticados" ON public.movimientos;
DROP POLICY IF EXISTS "Permitir insercion a roles autorizados" ON public.movimientos;
DROP POLICY IF EXISTS "Permitir gestion total a admin" ON public.movimientos;

-- 2. Política de LECTURA (SELECT)
-- Permite a cualquier usuario autenticado ver el historial de movimientos.
CREATE POLICY "Permitir lectura a usuarios autenticados"
  ON public.movimientos
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Política de INSERCIÓN (INSERT)
-- Permite a los roles 'admin', 'bodega' y 'enfermero' registrar nuevos movimientos.
CREATE POLICY "Permitir insercion a roles autorizados"
  ON public.movimientos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'bodega', 'enfermero')
    AND usuario_id = auth.uid() -- El usuario que inserta debe ser el dueño del movimiento
  );

-- 4. Política de ACTUALIZACIÓN (UPDATE)
-- Permite SOLO al 'admin' modificar movimientos para correcciones.
CREATE POLICY "Permitir actualizacion a admin"
  ON public.movimientos
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- 5. Política de ELIMINACIÓN (DELETE)
-- Permite SOLO al 'admin' eliminar movimientos para correcciones.
CREATE POLICY "Permitir eliminacion a admin"
  ON public.movimientos
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );
