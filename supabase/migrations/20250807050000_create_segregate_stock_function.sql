
-- 1. Add `condicion` column to `movimientos` table
ALTER TABLE public.movimientos
ADD COLUMN condicion TEXT NOT NULL DEFAULT 'Bueno';

-- 2. Create the `segregate_stock` function
CREATE OR REPLACE FUNCTION segregate_stock(
    p_producto_id INT,
    p_cantidad_a_mover INT,
    p_condicion_origen TEXT,
    p_condicion_destino TEXT
)
RETURNS VOID AS $$
DECLARE
    v_stock_disponible INT;
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
