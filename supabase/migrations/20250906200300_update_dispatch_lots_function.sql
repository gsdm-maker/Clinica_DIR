DROP FUNCTION IF EXISTS get_dispatch_lots(uuid);

CREATE OR REPLACE FUNCTION get_dispatch_lots(param_maestro_producto_id uuid)
RETURNS TABLE(
    producto_id uuid,
    numero_lote TEXT,
    fecha_vencimiento DATE,
    condicion_lote TEXT,
    stock_actual BIGINT,
    maestro_producto_nombre TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH movements_summary AS (
        -- Calculate stock for each product/condition pair, ignoring case
        SELECT
            m.producto_id,
            LOWER(m.condicion) as condicion,
            SUM(CASE WHEN m.tipo_movimiento = 'entrada' THEN m.cantidad ELSE -m.cantidad END)::bigint as stock
        FROM
            public.movimientos m
        GROUP BY
            m.producto_id, LOWER(m.condicion)
    )
    SELECT
        p.id::uuid,
        p.numero_lote::text,
        p.fecha_vencimiento,
        initcap(ms.condicion)::text, -- Standardize capitalization for display
        ms.stock::bigint,
        mp.nombre::text
    FROM
        movements_summary ms
    JOIN
        public.productos p ON ms.producto_id = p.id
    JOIN
        public.maestro_productos mp ON p.maestro_producto_id = mp.id
    WHERE
        p.maestro_producto_id = param_maestro_producto_id AND ms.stock > 0
    ORDER BY
        p.fecha_vencimiento ASC, p.numero_lote, ms.condicion;
END;
$$ LANGUAGE plpgsql;