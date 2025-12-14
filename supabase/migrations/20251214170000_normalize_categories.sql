-- 1. Add column categoria_id to maestro_productos
ALTER TABLE maestro_productos 
ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias(id);

-- 2. Migrate existing data: Match text category with the new categorias table
UPDATE maestro_productos
SET categoria_id = c.id
FROM categorias c
WHERE maestro_productos.categoria = c.nombre;

-- 3. Handle data that didn't match (optional: defaulting to 'otros' or similar, depending on existing data)
-- For now, we assume migration 20251214150000 seeded the standard categories matching text.

-- 4. Make categoria_id NOT NULL (This requires all rows to have a match. If not, this step fails, which is good for safety)
-- IF you have custom categories not in the seed, this might fail. We will adding a fallback just in case.
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'otros') THEN
     INSERT INTO categorias (nombre, descripcion) VALUES ('otros', 'Categoría General');
  END IF;
END $$;

-- Assign 'otros' ID to any product that still has NULL categoria_id
UPDATE maestro_productos
SET categoria_id = (SELECT id FROM categorias WHERE nombre = 'otros')
WHERE categoria_id IS NULL;

ALTER TABLE maestro_productos ALTER COLUMN categoria_id SET NOT NULL;

-- 5. Drop the old text column
ALTER TABLE maestro_productos DROP COLUMN categoria;

-- 6. Update the Inventory RPC function to join with categorias
-- We need to drop the old one first because the return type changes structure potentially (or we keep the alias)
DROP FUNCTION IF EXISTS get_inventory_stock;

CREATE OR REPLACE FUNCTION get_inventory_stock()
RETURNS TABLE (
  id UUID,
  maestro_producto_id UUID,
  numero_lote TEXT,
  fecha_vencimiento DATE,
  stock_actual INTEGER,
  total_stock_lote BIGINT,
  proveedor_id UUID,
  condicion TEXT,
  ultima_observacion TEXT,
  fecha_ingreso TIMESTAMPTZ,
  maestro_productos JSON,
  proveedores JSON
) AS $$
BEGIN
  RETURN QUERY
  WITH lote_stock AS (
    SELECT 
      p.numero_lote,
      SUM(p.stock_actual) as total
    FROM productos p
    GROUP BY p.numero_lote
  ),
  latest_obs AS (
      SELECT DISTINCT ON (m.producto_id)
          m.producto_id,
          m.motivo
      FROM movimientos m
      ORDER BY m.producto_id, m.created_at DESC
  )
  SELECT 
    p.id,
    p.maestro_producto_id,
    p.numero_lote,
    p.fecha_vencimiento,
    p.stock_actual,
    ls.total as total_stock_lote,
    p.proveedor_id,
    p.condicion,
    lo.motivo as ultima_observacion,
    p.fecha_ingreso,
    json_build_object(
      'id', mp.id,
      'nombre', mp.nombre,
      'categoria', c.nombre, -- We preserve the 'categoria' key in the JSON so frontend doesn't break essentially
      'stock_critico', mp.stock_critico
    ) as maestro_productos,
    json_build_object(
      'id', pr.id,
      'nombre', pr.nombre
    ) as proveedores
  FROM productos p
  JOIN maestro_productos mp ON p.maestro_producto_id = mp.id
  LEFT JOIN categorias c ON mp.categoria_id = c.id
  LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
  LEFT JOIN lote_stock ls ON p.numero_lote = ls.numero_lote
  LEFT JOIN latest_obs lo ON p.id = lo.producto_id
  ORDER BY mp.nombre ASC;
END;
$$ LANGUAGE plpgsql;
