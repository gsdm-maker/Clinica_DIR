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
            (m.maestro_productos) ->> 'nombre' as nombre_producto,
            (m.maestro_productos) ->> 'categoria' as categoria,
            (m.maestro_productos) ->> 'stock_critico' as stock_critico,
            (p.proveedores) ->> 'nombre' as nombre_proveedor,
            p.id as producto_id,
            p.proveedor_id,
            mv.condicion,
            SUM(CASE WHEN mv.tipo_movimiento = 'entrada' THEN mv.cantidad ELSE -mv.cantidad END) as stock
        FROM productos p
        JOIN movimientos mv ON p.id = mv.producto_id
        JOIN maestro_productos m ON p.maestro_producto_id = m.id
        GROUP BY p.maestro_producto_id, m.maestro_productos, p.proveedores, p.id, mv.condicion
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