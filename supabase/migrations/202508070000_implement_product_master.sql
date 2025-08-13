/*
  # PASO 1: Implementar Maestro de Productos (Corregido)

  Este script reestructura la base de datos para usar un catálogo central de productos (maestro)
  y una tabla separada para los lotes de inventario. 

  ADVERTENCIA: Este es un cambio destructivo. Los datos en las tablas `productos` y `movimientos`
  actuales serán eliminados para poder aplicar la nueva estructura.
*/

-- =============================================
-- 0. Limpiar datos dependientes
-- =============================================
-- Eliminar todos los movimientos existentes para evitar conflictos de clave externa.
DELETE FROM public.movimientos;

-- =============================================
-- 1. Crear la tabla `maestro_productos`
-- =============================================
CREATE TABLE IF NOT EXISTS public.maestro_productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE, -- El nombre del producto debe ser único
  categoria text NOT NULL,
  descripcion text,
  stock_critico integer NOT NULL DEFAULT 5,
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

-- Políticas de seguridad para `maestro_productos`
ALTER TABLE public.maestro_productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura a usuarios autenticados" ON public.maestro_productos;
CREATE POLICY "Permitir lectura a usuarios autenticados"
  ON public.maestro_productos
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Permitir gestion a admin y bodega" ON public.maestro_productos;
CREATE POLICY "Permitir gestion a admin y bodega"
  ON public.maestro_productos
  FOR ALL
  TO authenticated
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'bodega'))
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'bodega'));


-- =============================================
-- 2. Reestructurar la tabla `productos` para lotes
-- =============================================

-- Renombrar la tabla vieja para seguridad, luego la eliminaremos
ALTER TABLE public.productos RENAME TO productos_old;

-- Crear la nueva tabla `productos` que funcionará como `lotes`
CREATE TABLE IF NOT EXISTS public.productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maestro_producto_id uuid NOT NULL REFERENCES public.maestro_productos(id) ON DELETE CASCADE,
  stock_actual integer NOT NULL,
  numero_lote text,
  fecha_vencimiento date,
  proveedor text,
  condicion text DEFAULT 'bueno',
  observaciones text,
  bloqueado boolean DEFAULT false,
  fecha_ingreso timestamptz DEFAULT now(),
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

-- Políticas de seguridad para la nueva tabla `productos` (lotes)
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura a usuarios autenticados" ON public.productos;
CREATE POLICY "Permitir lectura a usuarios autenticados"
  ON public.productos
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Permitir gestion a admin y bodega" ON public.productos;
CREATE POLICY "Permitir gestion a admin y bodega"
  ON public.productos
  FOR ALL
  TO authenticated
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'bodega'))
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'bodega'));


-- =============================================
-- 3. Ajustar la tabla `movimientos`
-- =============================================

-- Eliminar la FK vieja que apuntaba a `productos_old`
ALTER TABLE public.movimientos DROP CONSTRAINT IF EXISTS movimientos_producto_id_fkey;

-- Añadir la nueva FK que apunta a la nueva tabla `productos` (lotes)
ALTER TABLE public.movimientos 
  ADD CONSTRAINT movimientos_producto_id_fkey
  FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE SET NULL;


-- =============================================
-- 4. Limpieza
-- =============================================

-- Eliminar la tabla antigua de productos
DROP TABLE public.productos_old;