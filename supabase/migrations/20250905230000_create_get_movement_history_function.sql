CREATE OR REPLACE FUNCTION get_movement_history(
    start_date date,
    end_date date,
    user_ids uuid[],
    movement_type text, -- 'entrada', 'salida', or NULL for all
    search_term text
)
RETURNS TABLE (
    fecha timestamptz,
    producto_nombre text,
    numero_lote text,
    tipo_movimiento text,
    cantidad integer,
    condicion text,
    usuario_email text,
    motivo text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.fecha,
        mp.nombre as producto_nombre,
        p.numero_lote,
        m.tipo_movimiento,
        m.cantidad,
        m.condicion,
        u.email as usuario_email,
        m.motivo
    FROM
        public.movimientos m
    LEFT JOIN
        public.productos p ON m.producto_id = p.id
    LEFT JOIN
        public.maestro_productos mp ON p.maestro_producto_id = mp.id
    LEFT JOIN
        public.users u ON m.usuario_id = u.id
    WHERE
        -- Date filter
        (m.fecha::date >= start_date AND m.fecha::date <= end_date)
        -- User filter (optional, works if array is NULL or empty)
        AND (user_ids IS NULL OR array_length(user_ids, 1) IS NULL OR m.usuario_id = ANY(user_ids))
        -- Movement type filter (optional)
        AND (movement_type IS NULL OR m.tipo_movimiento = movement_type)
        -- Search term filter (optional, searches product name or lot number)
        AND (
            search_term IS NULL OR
            mp.nombre ILIKE '%' || search_term || '%' OR
            p.numero_lote ILIKE '%' || search_term || '%'
        )
    ORDER BY
        m.fecha DESC;
END;
$$ LANGUAGE plpgsql;