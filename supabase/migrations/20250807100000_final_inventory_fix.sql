-- 1. Drop the old functions to avoid conflicts
DROP FUNCTION IF EXISTS get_inventory_stock();
DROP FUNCTION IF EXISTS segregate_stock(integer, integer, text, text);

-- 2. Create the corrected segregate_stock function
CREATE OR REPLACE FUNCTION segregate_stock(
    p_producto_id uuid,
    p_cantidad_a_mover integer,
    p_condicion_origen text,
    p_condicion_destino text
)
RETURNS void AS $$
DECLARE
    v_stock_disponible integer;
BEGIN
    -- Check current stock for the given condition
    SELECT COALESCE(SUM(CASE WHEN tipo_movimiento = 'entrada' THEN cantidad ELSE -cantidad END), 0)
    INTO v_stock_disponible
    FROM movimientos
    WHERE producto_id = p_producto_id AND condicion = p_condicion_origen;

    -- Verify if there is enough stock to move
    IF v_stock_disponible < p_cantidad_a_mover THEN
        RAISE EXCEPTION 'No hay suficiente stock en la condición % para mover. Stock disponible: %', p_condicion_origen, v_stock_disponible;
    END IF;

    -- Create a movement to "remove" stock from the source condition
    INSERT INTO movimientos (producto_id, tipo_movimiento, cantidad, fecha, condicion)
    VALUES (p_producto_id, 'salida', p_cantidad_a_mover, NOW(), p_condicion_origen);

    -- Create a movement to "add" stock to the destination condition
    INSERT INTO movimientos (producto_id, tipo_movimiento, cantidad, fecha, condicion)
    VALUES (p_producto_id, 'entrada', p_cantidad_a_mover, NOW(), p_condicion_destino);
END;
$$ LANGUAGE plpgsql;

-- 3. Create the final, corrected get_inventory_stock function
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
    SELECT
        p.id,
        p.maestro_producto_id,
        p.proveedor_id,
        COALESCE((SELECT SUM(CASE WHEN m.tipo_movimiento = 'entrada' THEN m.cantidad ELSE -m.cantidad END) FROM movimientos m WHERE m.producto_id = p.id), 0)::BIGINT AS stock_actual,
        p.numero_lote,
        p.fecha_vencimiento,
        p.observaciones,
        p.creado_en,
        p.bloqueado,
        p.fecha_ingreso,
        p.condicion,
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
        COALESCE((
            SELECT json_object_agg(m.condicion, m.stock)
            FROM (
                SELECT
                    m_inner.condicion,
                    SUM(CASE WHEN m_inner.tipo_movimiento = 'entrada' THEN m_inner.cantidad ELSE -m_inner.cantidad END) as stock
                FROM movimientos m_inner
                WHERE m_inner.producto_id = p.id
                GROUP BY m_inner.condicion
            ) m
            WHERE m.stock != 0
        ), '{}'::json) AS stock_por_condicion
    FROM
        productos p
    JOIN
        maestro_productos mp ON p.maestro_producto_id = mp.id
    LEFT JOIN
        proveedores prv ON p.proveedor_id = prv.id;
END;
$$ LANGUAGE plpgsql;