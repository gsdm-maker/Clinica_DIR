DROP FUNCTION IF EXISTS get_critical_stock_products_list();

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
    -- CTE to calculate stock for 'Bueno' condition only
    WITH bueno_stock AS (
        SELECT
            m.producto_id,
            SUM(CASE WHEN m.tipo_movimiento = 'entrada' THEN m.cantidad ELSE -m.cantidad END) as stock
        FROM
            public.movimientos m
        WHERE
            LOWER(m.condicion) = 'bueno'
        GROUP BY
            m.producto_id
    )
    SELECT
        p.id as producto_id,
        mp.nombre as producto_nombre,
        p.numero_lote,
        bs.stock::bigint as stock_actual,
        mp.stock_critico,
        p.fecha_vencimiento,
        'Bueno'::text as condicion -- The condition for this list is always 'Bueno'
    FROM
        bueno_stock bs
    JOIN
        public.productos p ON bs.producto_id = p.id
    JOIN
        public.maestro_productos mp ON p.maestro_producto_id = mp.id
    WHERE
        bs.stock <= mp.stock_critico AND bs.stock > 0
    ORDER BY
        mp.nombre, p.numero_lote;
END;
$$ LANGUAGE plpgsql;