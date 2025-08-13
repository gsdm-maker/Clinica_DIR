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
    WITH movements_summary AS (
        SELECT
            m.producto_id,
            m.condicion,
            SUM(CASE WHEN m.tipo_movimiento = 'entrada' THEN m.cantidad ELSE -m.cantidad END) as stock_change
        FROM
            public.movimientos m
        GROUP BY
            m.producto_id, m.condicion
    ),
    aggregated_stock_per_product AS (
        SELECT
            ms.producto_id,
            SUM(ms.stock_change) AS total_stock_for_product,
            json_object_agg(
                ms.condicion,
                ms.stock_change
            ) FILTER (WHERE ms.condicion IS NOT NULL AND ms.stock_change != 0) AS stock_breakdown_for_product
        FROM
            movements_summary ms
        GROUP BY
            ms.producto_id
    )
    SELECT
        p.id,
        p.maestro_producto_id,
        p.proveedor_id,
        COALESCE(aspp.total_stock_for_product, 0)::BIGINT AS stock_actual,
        p.numero_lote,
        p.fecha_vencimiento::TIMESTAMPTZ, -- Explicitly cast to TIMESTAMPTZ
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
        public.productos p
    LEFT JOIN
        aggregated_stock_per_product aspp ON p.id = aspp.producto_id
    JOIN
        public.maestro_productos mp ON p.maestro_producto_id = mp.id
    LEFT JOIN
        public.proveedores prv ON p.proveedor_id = prv.id;
END;
$$ LANGUAGE plpgsql;