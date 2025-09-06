CREATE OR REPLACE FUNCTION get_critical_stock_products_list()
RETURNS TABLE(
    producto_id uuid,
    producto_nombre text,
    numero_lote text,
    stock_actual bigint,
    stock_critico integer,
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
        mp.stock_critico,
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
        COALESCE(aspp.total_stock_for_product, 0) <= mp.stock_critico AND COALESCE(aspp.total_stock_for_product, 0) > 0
    ORDER BY
        mp.nombre, p.numero_lote;
END;
$$ LANGUAGE plpgsql;