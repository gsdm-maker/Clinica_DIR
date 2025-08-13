DROP FUNCTION IF EXISTS get_inventory_stock();

CREATE OR REPLACE FUNCTION get_inventory_stock()
RETURNS TABLE(
    id uuid,
    maestro_producto_id uuid,
    proveedor_id uuid,
    stock_actual BIGINT,
    maestro_productos JSON,
    proveedores JSON,
    stock_por_condicion JSON
) AS $$
BEGIN
    RETURN QUERY
    WITH stock_per_condition AS (
        SELECT
            p.id as producto_id,
            mv.condicion,
            COALESCE(SUM(CASE WHEN mv.tipo_movimiento = 'entrada' THEN mv.cantidad ELSE -mv.cantidad END), 0) as stock
        FROM productos p
        LEFT JOIN movimientos mv ON p.id = mv.producto_id
        GROUP BY p.id, mv.condicion
    ),
    aggregated_stock AS (
        SELECT
            spc.producto_id,
            json_object_agg(COALESCE(spc.condicion, 'Indefinido'), spc.stock) as stock_por_condicion,
            SUM(spc.stock) as total_stock
        FROM stock_per_condition spc
        GROUP BY spc.producto_id
    )
    SELECT
        p.id,
        p.maestro_producto_id,
        p.proveedor_id,
        ags.total_stock AS stock_actual,
        json_build_object(
            'id', mp.id,
            'nombre', mp.nombre,
            'categoria', mp.categoria,
            'stock_critico', mp.stock_critico
        ) AS maestro_productos,
        json_build_object(
            'id', prv.id,
            'nombre', prv.nombre
        ) AS proveedores,
        ags.stock_por_condicion
    FROM productos p
    JOIN aggregated_stock ags ON p.id = ags.producto_id
    JOIN maestro_productos mp ON p.maestro_producto_id = mp.id
    LEFT JOIN proveedores prv ON p.proveedor_id = prv.id;
END;
$$ LANGUAGE plpgsql;