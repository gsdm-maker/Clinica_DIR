CREATE OR REPLACE FUNCTION get_expiring_products_list(days_threshold integer)
RETURNS TABLE(
    producto_id uuid,
    producto_nombre text,
    numero_lote text,
    stock_actual bigint,
    fecha_vencimiento date,
    condicion text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id as producto_id,
        mp.nombre as producto_nombre,
        p.numero_lote,
        COALESCE(aspp.total_stock_for_product, 0)::bigint as stock_actual,
        p.fecha_vencimiento,
        p.condicion
    FROM
        public.productos p
    JOIN
        public.maestro_productos mp ON p.maestro_producto_id = mp.id
    LEFT JOIN (
        SELECT
            m.producto_id,
            SUM(CASE WHEN m.tipo_movimiento = 'entrada' THEN m.cantidad ELSE -m.cantidad END)::bigint as total_stock_for_product
        FROM
            public.movimientos m
        GROUP BY
            m.producto_id
    ) aspp ON p.id = aspp.producto_id
    WHERE
        p.fecha_vencimiento <= (NOW() + INTERVAL '1 day' * days_threshold)::date AND COALESCE(aspp.total_stock_for_product, 0) > 0
    ORDER BY
        p.fecha_vencimiento ASC, mp.nombre;
END;
$$ LANGUAGE plpgsql;