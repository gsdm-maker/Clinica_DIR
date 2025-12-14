CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  total_products INTEGER;
  critical_stock_products INTEGER;
  expired_products INTEGER;
  quarantine_products INTEGER;
  recent_movements JSON;
  category_distribution JSON;
BEGIN
  -- 1. Total active lots (stock > 0)
  SELECT COUNT(*) INTO total_products FROM productos WHERE stock_actual > 0;

  -- 2. Critical stock count
  SELECT COUNT(*) INTO critical_stock_products
  FROM productos p
  JOIN maestro_productos mp ON p.maestro_producto_id = mp.id
  WHERE p.stock_actual <= mp.stock_critico AND p.stock_actual > 0;

  -- 3. Expired products count
  SELECT COUNT(*) INTO expired_products
  FROM productos
  WHERE fecha_vencimiento < CURRENT_DATE AND stock_actual > 0;

  -- 4. Quarantine products count
  SELECT COUNT(*) INTO quarantine_products
  FROM productos
  WHERE condicion = 'Cuarentena' AND stock_actual > 0;

  -- 5. Recent movements (last 10)
  -- Join with users and master products to return friendly names
  SELECT json_agg(t) INTO recent_movements
  FROM (
      SELECT 
          m.id,
          mp.nombre as producto_nombre,
          u.name as usuario_nombre,
          m.tipo_movimiento,
          m.cantidad,
          m.creado_en as fecha
      FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      JOIN maestro_productos mp ON p.maestro_producto_id = mp.id
      LEFT JOIN users u ON m.usuario_id = u.id
      ORDER BY m.creado_en DESC
      LIMIT 10
  ) t;

  -- 6. Category Distribution (formatted for Recharts)
  SELECT json_agg(json_build_object('category', cat_name, 'count', count, 'value', count)) INTO category_distribution
  FROM (
    SELECT c.nombre as cat_name, COUNT(*) as count
    FROM productos p
    JOIN maestro_productos mp ON p.maestro_producto_id = mp.id
    LEFT JOIN categorias c ON mp.categoria_id = c.id
    WHERE p.stock_actual > 0
    GROUP BY c.nombre
  ) t;

  -- Return object matching Frontend Interface
  RETURN json_build_object(
    'total_products', total_products,
    'critical_stock_products', critical_stock_products,
    'expired_products', expired_products,
    'quarantine_products', quarantine_products,
    'recent_movements', COALESCE(recent_movements, '[]'::json),
    'category_distribution', COALESCE(category_distribution, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql;
