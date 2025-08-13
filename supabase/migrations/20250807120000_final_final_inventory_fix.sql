DROP FUNCTION IF EXISTS get_inventory_stock();

CREATE OR REPLACE FUNCTION get_inventory_stock()
RETURNS TABLE(
    id uuid,
    maestro_producto_id uuid,
    proveedor_id uuid,
    stock_actual BIGINT,
    numero_lote TEXT,
    fecha_vencimiento TIMESTAMPTZ,
    observaciones TEXT,
    creado_en TIMESTAMPTZ,
    bloqueado BOOLEAN,
    fecha_ingreso TIMESTAMPTZ,
    condicion TEXT,
    maestro_productos JSON,
    proveedores JSON,
    stock_por_condicion JSON
) AS $$
BEGIN
    RETURN QUERY
    WITH product_stock_by_condition AS (
        SELECT
            producto_id,
            condicion,
            SUM(CASE WHEN tipo_movimiento = 'entrada' THEN cantidad ELSE -cantidad END) as stock_in_condition
        FROM movimientos
        GROUP BY producto_id, condicion
    ),
    aggregated_product_stock AS (
        SELECT
            psbc.producto_id,
            SUM(psbc.stock_in_condition) AS total_stock,
            json_object_agg(
                psbc.condicion,
                psbc.stock_in_condition
            ) FILTER (WHERE psbc.condicion IS NOT NULL AND psbc.stock_in_condition != 0) AS stock_breakdown
        FROM product_stock_by_condition psbc
        GROUP BY psbc.producto_id
    )
    SELECT
        p.id,
        p.maestro_producto_id,
        p.proveedor_id,
        COALESCE(aps.total_stock, 0)::BIGINT AS stock_actual,
        p.numero_lote,
        p.fecha_vencimiento,
        p.observaciones,
        p.creado_en,
        p.bloqueado,
        p.fecha_ingreso,
        p.condicion,
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
        COALESCE(aps.stock_breakdown, '{}'::json) AS stock_por_condicion
    FROM
        productos p
    LEFT JOIN
        aggregated_product_stock aps ON p.id = aps.producto_id
    JOIN
        maestro_productos mp ON p.maestro_producto_id = mp.id
    LEFT JOIN
        proveedores prv ON p.proveedor_id = prv.id;
END;
$$ LANGUAGE plpgsql;