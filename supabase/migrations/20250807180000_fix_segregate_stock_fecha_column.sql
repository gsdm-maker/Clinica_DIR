DROP FUNCTION IF EXISTS segregate_stock(uuid, integer, text, text);

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
    INSERT INTO movimientos (producto_id, tipo_movimiento, cantidad, creado_en, condicion)
    VALUES (p_producto_id, 'salida', p_cantidad_a_mover, NOW(), p_condicion_origen);

    -- Create a movement to "add" stock to the destination condition
    INSERT INTO movimientos (producto_id, tipo_movimiento, cantidad, creado_en, condicion)
    VALUES (p_producto_id, 'entrada', p_cantidad_a_mover, NOW(), p_condicion_destino);
END;
$$ LANGUAGE plpgsql;