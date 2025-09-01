-- Corregir la función para obtener estadísticas del dashboard
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  -- Declarar variables para almacenar los resultados
  total_products_count integer;
  critical_stock_count integer;
  expired_products_count integer;
  quarantine_products_count integer;
  recent_movements_data json;
  category_distribution_data json;
BEGIN
  -- 1. Contar el total de productos (lotes únicos)
  SELECT count(*) INTO total_products_count FROM public.productos;

  -- 2. Contar productos en stock crítico
  SELECT count(*) INTO critical_stock_count
  FROM public.productos p
  JOIN public.maestro_productos mp ON p.maestro_producto_id = mp.id
  WHERE p.stock_actual <= mp.stock_critico;

  -- 3. Contar productos vencidos
  SELECT count(*) INTO expired_products_count FROM public.productos WHERE fecha_vencimiento < now();

  -- 4. Contar productos en cuarentena
  SELECT count(*) INTO quarantine_products_count FROM public.productos WHERE condicion = 'cuarentena';

  -- 5. Obtener los 5 movimientos más recientes (CORREGIDO)
  SELECT json_agg(row_to_json(t))
  INTO recent_movements_data
  FROM (
    SELECT 
      m.id,
      m.tipo_movimiento, -- Corregido de m.tipo
      m.cantidad,
      m.creado_en,
      mp.nombre as producto_nombre, -- Corregido de p.descripcion y se usa el join a maestro_productos
      u.email as usuario_email -- Usar email de la tabla auth.users
    FROM public.movimientos m
    LEFT JOIN public.productos p ON m.producto_id = p.id
    LEFT JOIN public.maestro_productos mp ON p.maestro_producto_id = mp.id -- Join para obtener el nombre
    LEFT JOIN auth.users u ON m.usuario_id = u.id -- Join a auth.users para el email
    ORDER BY m.creado_en DESC
    LIMIT 5
  ) t;

  -- 6. Obtener la distribución de productos por categoría
  SELECT json_agg(row_to_json(c))
  INTO category_distribution_data
  FROM (
    SELECT mp.categoria, count(*) as count
    FROM public.productos p
    JOIN public.maestro_productos mp ON p.maestro_producto_id = mp.id
    GROUP BY mp.categoria
  ) c;

  -- 7. Devolver todos los datos como un solo objeto JSON
  RETURN json_build_object(
    'total_products', total_products_count,
    'critical_stock_products', critical_stock_count,
    'expired_products', expired_products_count,
    'quarantine_products', quarantine_products_count,
    'recent_movements', COALESCE(recent_movements_data, '[]'::json),
    'category_distribution', COALESCE(category_distribution_data, '[]'::json)
  );
END;
$$;
