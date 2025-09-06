CREATE OR REPLACE FUNCTION get_dispatch_lots(p_maestro_producto_id uuid)
RETURNS TABLE(
    producto_id uuid,
    numero_lote TEXT,
    fecha_vencimiento TIMESTAMPTZ,
    condicion TEXT,
    stock_actual BIGINT,
    maestro_producto_nombre TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH movements_summary AS (
        -- Calculate stock for each product/condition pair
        SELECT
            m.producto_id,
            m.condicion,
            SUM(CASE WHEN m.tipo_movimiento = 'entrada' THEN m.cantidad ELSE -m.cantidad END) as stock
        FROM
            public.movimientos m
        GROUP BY
            m.producto_id, m.condicion
    )
    SELECT
        p.id as producto_id,
        p.numero_lote,
        p.fecha_vencimiento,
        ms.condicion,
        ms.stock as stock_actual,
        mp.nombre as maestro_producto_nombre
    FROM
        movements_summary ms
    JOIN
        public.productos p ON ms.producto_id = p.id
    JOIN
        public.maestro_productos mp ON p.maestro_producto_id = mp.id
    WHERE
        p.maestro_producto_id = p_maestro_producto_id AND ms.stock > 0
    ORDER BY
        p.fecha_vencimiento ASC, p.numero_lote, ms.condicion;
END;
$$ LANGUAGE plpgsql;