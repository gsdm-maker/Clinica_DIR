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
    WITH stock_by_product_and_condition AS (
        SELECT
            producto_id,
            condicion,
            SUM(CASE WHEN tipo_movimiento = 'entrada' THEN cantidad ELSE -cantidad END) as stock_in_condition
        FROM
            movimientos
        GROUP BY
            producto_id, condicion
    ),
    aggregated_stock_per_product AS (
        SELECT
            sbc.producto_id,
            SUM(sbc.stock_in_condition) AS total_stock_for_product,
            json_object_agg(
                sbc.condicion,
                sbc.stock_in_condition
            ) FILTER (WHERE sbc.condicion IS NOT NULL AND sbc.stock_in_condition != 0) AS stock_breakdown_for_product
        FROM
            stock_by_product_and_condition sbc
        GROUP BY
            sbc.producto_id
    )
    SELECT
        p.id,
        p.maestro_producto_id,
        p.proveedor_id,
        COALESCE(aspp.total_stock_for_product, 0)::BIGINT AS stock_actual,
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
        COALESCE(aspp.stock_breakdown_for_product, '{}'::json) AS stock_por_condicion
    FROM
        productos p
    LEFT JOIN
        aggregated_stock_per_product aspp ON p.id = aspp.producto_id
    JOIN
        maestro_productos mp ON p.maestro_producto_id = mp.id
    LEFT JOIN
        proveedores prv ON p.proveedor_id = prv.id;
END;
$$ LANGUAGE plpgsql;