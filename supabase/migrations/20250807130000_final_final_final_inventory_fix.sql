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
    stock_por_condicion JSON
) AS $$
BEGIN
    RETURN QUERY
    WITH product_movements AS (
        SELECT
            p.id as product_id,
            p.maestro_producto_id,
            p.proveedor_id,
            p.numero_lote,
            p.fecha_vencimiento,
            p.observaciones,
            p.creado_en,
            p.bloqueado,
            p.fecha_ingreso,
            p.condicion as product_condition, -- Alias to avoid conflict with movement condition
            m.condicion as movement_condition,
            m.tipo_movimiento,
            m.cantidad
        FROM
            productos p
        LEFT JOIN
            movimientos m ON p.id = m.producto_id
    ),
    stock_by_lot_and_condition AS (
        SELECT
            pm.product_id,
            pm.maestro_producto_id,
            pm.proveedor_id,
            pm.numero_lote,
            pm.fecha_vencimiento,
            pm.observaciones,
            pm.creado_en,
            pm.bloqueado,
            pm.fecha_ingreso,
            pm.product_condition,
            pm.movement_condition,
            SUM(CASE WHEN pm.tipo_movimiento = 'entrada' THEN pm.cantidad ELSE -pm.cantidad END) as stock_in_condition
        FROM
            product_movements pm
        GROUP BY
            pm.product_id, pm.maestro_producto_id, pm.proveedor_id, pm.numero_lote, pm.fecha_vencimiento,
            pm.observaciones, pm.creado_en, pm.bloqueado, pm.fecha_ingreso, pm.product_condition, pm.movement_condition
    ),
    aggregated_stock_per_lot AS (
        SELECT
            sblc.product_id,
            SUM(sblc.stock_in_condition) AS total_stock_for_lot,
            json_object_agg(
                sblc.movement_condition,
                sblc.stock_in_condition
            ) FILTER (WHERE sblc.movement_condition IS NOT NULL AND sblc.stock_in_condition != 0) AS stock_breakdown_for_lot
        FROM
            stock_by_lot_and_condition sblc
        GROUP BY
            sblc.product_id
    )
    SELECT
        p.id,
        p.maestro_producto_id,
        p.proveedor_id,
        COALESCE(aspl.total_stock_for_lot, 0)::BIGINT AS stock_actual,
        p.numero_lote,
        p.fecha_vencimiento,
        p.observaciones,
        p.creado_en,
        p.bloqueado,
        p.fecha_ingreso,
        p.condicion, -- This is the condition of the product lot itself, not from movements
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
        COALESCE(aspl.stock_breakdown_for_lot, '{}'::json) AS stock_por_condicion
    FROM
        productos p
    LEFT JOIN
        aggregated_stock_per_lot aspl ON p.id = aspl.product_id
    JOIN
        maestro_productos mp ON p.maestro_producto_id = mp.id
    LEFT JOIN
        proveedores prv ON p.proveedor_id = prv.id;
END;
$$ LANGUAGE plpgsql;