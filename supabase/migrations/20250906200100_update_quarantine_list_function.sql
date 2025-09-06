DROP FUNCTION IF EXISTS get_quarantine_products_list();

CREATE OR REPLACE FUNCTION get_quarantine_products_list()
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
    WITH stock_in_quarantine AS (
        -- Calculate stock for each product specifically in 'Cuarentena', case-insensitive
        SELECT
            m.producto_id,
            LOWER(m.condicion) as condicion_actual,
            SUM(CASE WHEN m.tipo_movimiento = 'entrada' THEN m.cantidad ELSE -m.cantidad END) as stock
        FROM
            public.movimientos m
        GROUP BY
            m.producto_id, LOWER(m.condicion)
        HAVING
            LOWER(m.condicion) = 'cuarentena' AND SUM(CASE WHEN m.tipo_movimiento = 'entrada' THEN m.cantidad ELSE -m.cantidad END) > 0
    )
    SELECT
        p.id as producto_id,
        mp.nombre as producto_nombre,
        p.numero_lote,
        siq.stock::bigint as stock_actual,
        p.fecha_vencimiento,
        initcap(siq.condicion_actual) as condicion
    FROM
        stock_in_quarantine siq
    JOIN
        public.productos p ON siq.producto_id = p.id
    JOIN
        public.maestro_productos mp ON p.maestro_producto_id = mp.id
    ORDER BY
        mp.nombre, p.numero_lote;
END;
$$ LANGUAGE plpgsql;