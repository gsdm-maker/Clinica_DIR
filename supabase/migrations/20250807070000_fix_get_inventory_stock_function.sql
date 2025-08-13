CREATE OR REPLACE FUNCTION get_inventory_stock()
RETURNS TABLE(
    id TEXT,
    maestro_producto_id TEXT,
    proveedor_id TEXT,
    stock_actual INTEGER,
    condicion TEXT,
    maestro_productos JSON,
    proveedores JSON,
    stock_por_condicion JSON
) AS $$
BEGIN
    RETURN QUERY
    WITH stock_summary AS (
        SELECT
            p.maestro_producto_id,
            mp.nombre as nombre_producto,
            mp.categoria as categoria,
            mp.stock_critico as stock_critico,
            pr.nombre as nombre_proveedor,
            p.id as producto_id,
            p.proveedor_id,
            mv.condicion,
            SUM(CASE WHEN mv.tipo_movimiento = 'entrada' THEN mv.cantidad ELSE -mv.cantidad END) as stock
        FROM productos p
        LEFT JOIN movimientos mv ON p.id = mv.producto_id
        LEFT JOIN maestro_productos mp ON p.maestro_producto_id = mp.id
        LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
        GROUP BY p.maestro_producto_id, mp.nombre, mp.categoria, mp.stock_critico, pr.nombre, p.id, mv.condicion
    )
    SELECT
        s.producto_id as id,
        s.maestro_producto_id,
        s.proveedor_id,
        SUM(s.stock)::INTEGER as stock_actual,
        s.condicion,
        json_build_object(
            'nombre', s.nombre_producto,
            'categoria', s.categoria,
            'stock_critico', s.stock_critico
        ) as maestro_productos,
        json_build_object(
            'nombre', s.nombre_proveedor
        ) as proveedores,
        json_object_agg(s.condicion, s.stock) as stock_por_condicion
    FROM stock_summary s
    GROUP BY s.producto_id, s.maestro_producto_id, s.proveedor_id, s.nombre_producto, s.categoria, s.stock_critico, s.nombre_proveedor, s.condicion;
END;
$$ LANGUAGE plpgsql;