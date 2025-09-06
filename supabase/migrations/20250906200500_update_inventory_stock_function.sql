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
    total_stock_lote BIGINT,
    ultima_observacion TEXT -- Columna añadida
) AS $$
BEGIN
    RETURN QUERY
    WITH stock_per_condition AS (
        SELECT
            m.producto_id,
            LOWER(m.condicion) as condicion,
            SUM(CASE WHEN m.tipo_movimiento = 'entrada' THEN m.cantidad ELSE -m.cantidad END) as stock
        FROM public.movimientos m
        GROUP BY m.producto_id, LOWER(m.condicion)
        HAVING SUM(CASE WHEN m.tipo_movimiento = 'entrada' THEN m.cantidad ELSE -m.cantidad END) > 0
    ),
    total_stock_per_product AS (
        SELECT
            s.producto_id,
            SUM(s.stock) as total_stock
        FROM stock_per_condition s
        GROUP BY s.producto_id
    ),
    latest_observation AS (
        -- Subconsulta para encontrar la observación más reciente por lote y condición
        SELECT DISTINCT ON (mov.producto_id, LOWER(mov.condicion))
            mov.producto_id,
            LOWER(mov.condicion) as condicion,
            mov.motivo
        FROM public.movimientos mov
        WHERE mov.motivo IS NOT NULL AND TRIM(mov.motivo) <> ''
        ORDER BY mov.producto_id, LOWER(mov.condicion), mov.creado_en DESC
    )
    SELECT
        p.id,
        p.maestro_producto_id,
        p.proveedor_id,
        spc.stock::BIGINT AS stock_actual,
        p.numero_lote,
        p.fecha_vencimiento::TIMESTAMPTZ,
        p.observaciones,
        p.creado_en,
        p.bloqueado,
        p.fecha_ingreso,
        initcap(spc.condicion) AS condicion,
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
        tsp.total_stock::BIGINT AS total_stock_lote,
        lo.motivo AS ultima_observacion -- Se añade la última observación
    FROM
        stock_per_condition spc
    JOIN
        public.productos p ON spc.producto_id = p.id
    JOIN
        total_stock_per_product tsp ON p.id = tsp.producto_id
    JOIN
        public.maestro_productos mp ON p.maestro_producto_id = mp.id
    LEFT JOIN
        public.proveedores prv ON p.proveedor_id = prv.id
    LEFT JOIN
        latest_observation lo ON spc.producto_id = lo.producto_id AND spc.condicion = lo.condicion
    ORDER BY
        mp.nombre, p.numero_lote, spc.condicion;
END;
$$ LANGUAGE plpgsql;