-- Drop the existing function first to allow changing the return type
DROP FUNCTION IF EXISTS get_movement_history(date,date,uuid[],text,text);

-- Recreate the function with the new 'proveedor_nombre' column
CREATE OR REPLACE FUNCTION get_movement_history(
    start_date date,
    end_date date,
    user_ids uuid[],
    movement_type text,
    search_term text
)
RETURNS TABLE (
    fecha timestamptz,
    producto_nombre text,
    numero_lote text,
    proveedor_nombre text, -- ADDED
    tipo_movimiento text,
    cantidad integer,
    condicion text,
    usuario_email text,
    motivo text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.creado_en as fecha,
        mp.nombre as producto_nombre,
        p.numero_lote,
        prov.nombre as proveedor_nombre, -- ADDED
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
    LEFT JOIN
        public.proveedores prov ON p.proveedor_id = prov.id -- ADDED JOIN
    WHERE
        (m.creado_en::date >= start_date AND m.creado_en::date <= end_date)
        AND (user_ids IS NULL OR array_length(user_ids, 1) IS NULL OR m.usuario_id = ANY(user_ids))
        AND (movement_type IS NULL OR m.tipo_movimiento = movement_type)
        AND (
            search_term IS NULL OR
            mp.nombre ILIKE '%' || search_term || '%' OR
            p.numero_lote ILIKE '%' || search_term || '%' OR
            prov.nombre ILIKE '%' || search_term || '%' -- ADDED
        )
    ORDER BY
        m.creado_en DESC;
END;
$$ LANGUAGE plpgsql;