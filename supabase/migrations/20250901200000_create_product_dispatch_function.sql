
CREATE OR REPLACE FUNCTION registrar_salida_producto(
    p_maestro_producto_id uuid,
    p_cantidad_solicitada integer,
    p_motivo text,
    p_usuario_id uuid
)
RETURNS void AS $$
DECLARE
    v_cantidad_restante integer := p_cantidad_solicitada;
    v_stock_total integer;
    lote_record record;
    v_cantidad_a_mover integer;
BEGIN
    -- Validar que el usuario tenga permisos (opcional, pero recomendado)
    -- ... aquí se podría añadir una comprobación del rol del usuario si es necesario ...

    -- Calcular el stock total disponible para el producto maestro en condición 'Bueno'
    SELECT COALESCE(SUM(stock_actual), 0)
    INTO v_stock_total
    FROM productos
    WHERE maestro_producto_id = p_maestro_producto_id
      AND condicion = 'Bueno'
      AND stock_actual > 0;

    -- Si no hay suficiente stock, lanzar un error
    IF v_stock_total < p_cantidad_solicitada THEN
        RAISE EXCEPTION 'No hay suficiente stock disponible. Stock total: %, Solicitado: %', v_stock_total, p_cantidad_solicitada;
    END IF;

    -- Iterar sobre los lotes disponibles, ordenados por fecha de vencimiento (FEFO)
    FOR lote_record IN
        SELECT id, stock_actual
        FROM productos
        WHERE maestro_producto_id = p_maestro_producto_id
          AND condicion = 'Bueno'
          AND stock_actual > 0
        ORDER BY fecha_vencimiento ASC
    LOOP
        -- Determinar cuánto mover de este lote
        IF lote_record.stock_actual >= v_cantidad_restante THEN
            v_cantidad_a_mover := v_cantidad_restante;
        ELSE
            v_cantidad_a_mover := lote_record.stock_actual;
        END IF;

        -- Actualizar el stock del lote actual
        UPDATE productos
        SET stock_actual = stock_actual - v_cantidad_a_mover
        WHERE id = lote_record.id;

        -- Registrar el movimiento de salida
        INSERT INTO movimientos (producto_id, usuario_id, tipo_movimiento, cantidad, motivo, condicion)
        VALUES (lote_record.id, p_usuario_id, 'salida', v_cantidad_a_mover, p_motivo, 'Bueno');

        -- Actualizar la cantidad restante
        v_cantidad_restante := v_cantidad_restante - v_cantidad_a_mover;

        -- Si ya hemos cubierto la cantidad solicitada, salir del bucle
        IF v_cantidad_restante <= 0 THEN
            EXIT;
        END IF;
    END LOOP;

    -- Si después del bucle aún queda cantidad restante (no debería pasar si la comprobación inicial es correcta),
    -- es un error de consistencia.
    IF v_cantidad_restante > 0 THEN
        RAISE EXCEPTION 'Error de consistencia de datos durante la salida de stock.';
    END IF;

END;
$$ LANGUAGE plpgsql;
