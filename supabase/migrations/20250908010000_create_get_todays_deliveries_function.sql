CREATE OR REPLACE FUNCTION get_todays_deliveries()
RETURNS TABLE (
    id uuid,
    created_at timestamptz,
    paciente_id uuid,
    mes_entrega date,
    indicaciones_medicas text,
    usuario_id uuid,
    pacientes json,
    usuario json,
    entregas_items jsonb[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.created_at,
        e.paciente_id,
        e.mes_entrega,
        e.indicaciones_medicas,
        e.usuario_id,
        json_build_object('nombre', p.nombre, 'rut', p.rut) as pacientes,
        json_build_object('name', u.name) as usuario,
        (SELECT COALESCE(array_agg(jsonb_build_object(
            'cantidad', ei.cantidad,
            'maestro_productos', jsonb_build_object('nombre', mp.nombre)
        )), '{}')
         FROM entregas_items ei
         JOIN maestro_productos mp ON ei.maestro_producto_id = mp.id
         WHERE ei.entrega_id = e.id
        ) as entregas_items
    FROM
        entregas e
    LEFT JOIN
        pacientes p ON e.paciente_id = p.id
    LEFT JOIN
        users u ON e.usuario_id = u.id
    WHERE
        e.created_at >= date_trunc('day', now() AT TIME ZONE 'utc') AND
        e.created_at < date_trunc('day', now() AT TIME ZONE 'utc') + interval '1 day'
    ORDER BY
        e.created_at DESC;
END;
$$ LANGUAGE plpgsql;
