DROP FUNCTION IF EXISTS get_dashboard_stats();

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  total_products_count integer;
  critical_stock_count integer;
  expired_products_count integer;
  quarantine_products_count integer;
  recent_movements_data json;
  category_distribution_data json;
BEGIN
  -- Use a temporary table to calculate and store current stock for this transaction
  CREATE TEMP TABLE temp_current_stock ON COMMIT DROP AS
  SELECT
    p.maestro_producto_id,
    m.producto_id,
    LOWER(m.condicion) as condicion,
    p.fecha_vencimiento,
    SUM(CASE WHEN m.tipo_movimiento = 'entrada' THEN m.cantidad ELSE -m.cantidad END) as stock
  FROM public.movimientos m
  JOIN public.productos p ON m.producto_id = p.id
  GROUP BY p.maestro_producto_id, m.producto_id, LOWER(m.condicion), p.fecha_vencimiento;

  -- Now, use the temporary table to calculate all stats
  SELECT
    (SELECT COUNT(DISTINCT cs.maestro_producto_id) FROM temp_current_stock cs WHERE cs.stock > 0),
    (SELECT COUNT(*) FROM (
      SELECT cs.maestro_producto_id
      FROM temp_current_stock cs
      WHERE cs.condicion = 'bueno'
      GROUP BY cs.maestro_producto_id
      HAVING SUM(cs.stock) <= (SELECT mp.stock_critico FROM maestro_productos mp WHERE mp.id = cs.maestro_producto_id)
         AND SUM(cs.stock) > 0
    ) as critical_products),
    (SELECT COUNT(DISTINCT cs.producto_id) FROM temp_current_stock cs WHERE cs.fecha_vencimiento < now() AND cs.stock > 0),
    (SELECT COUNT(DISTINCT cs.producto_id) FROM temp_current_stock cs WHERE cs.condicion = 'cuarentena' AND cs.stock > 0)
  INTO
    total_products_count,
    critical_stock_count,
    expired_products_count,
    quarantine_products_count;

  -- Get recent movements
  SELECT json_agg(row_to_json(t))
  INTO recent_movements_data
  FROM (
    SELECT 
      m.id,
      m.tipo_movimiento,
      m.cantidad,
      m.creado_en as fecha,
      mp.nombre as producto_nombre,
      u.email as usuario_email,
      initcap(m.condicion) as condicion,
      m.motivo
    FROM public.movimientos m
    LEFT JOIN public.productos p ON m.producto_id = p.id
    LEFT JOIN public.maestro_productos mp ON p.maestro_producto_id = mp.id
    LEFT JOIN public.users u ON m.usuario_id = u.id
    ORDER BY m.creado_en DESC
    LIMIT 10
  ) t;

  -- Get category distribution using the temp table
  SELECT json_agg(row_to_json(c))
  INTO category_distribution_data
  FROM (
    SELECT
      mp.categoria,
      COUNT(DISTINCT cs.maestro_producto_id) as count
    FROM temp_current_stock cs
    JOIN public.maestro_productos mp ON cs.maestro_producto_id = mp.id
    WHERE cs.stock > 0
    GROUP BY mp.categoria
  ) c;

  -- Return all data
  RETURN json_build_object(
    'total_products', COALESCE(total_products_count, 0),
    'critical_stock_products', COALESCE(critical_stock_count, 0),
    'expired_products', COALESCE(expired_products_count, 0),
    'quarantine_products', COALESCE(quarantine_products_count, 0),
    'recent_movements', COALESCE(recent_movements_data, '[]'::json),
    'category_distribution', COALESCE(category_distribution_data, '[]'::json)
  );
END;
$$;