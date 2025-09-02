CREATE OR REPLACE FUNCTION registrar_salida_manual(
    p_usuario_id uuid,
    p_motivo text,
    p_salidas jsonb
)
RETURNS void AS $$
DECLARE
    salida_item jsonb;
    producto_record record;
BEGIN
    -- Asegurarnos de que el array no esté vacío
    IF jsonb_array_length(p_salidas) = 0 THEN
        RAISE EXCEPTION 'La lista de salidas no puede estar vacía.';
    END IF;

    -- Primera pasada: Validar todo el "carrito" antes de hacer cambios
    FOR salida_item IN SELECT * FROM jsonb_array_elements(p_salidas)
    LOOP
        -- Obtener el estado actual del producto/lote desde la base de datos
        SELECT * INTO producto_record FROM productos WHERE id = (salida_item->>'producto_id')::uuid;

        -- Validar que el producto existe
        IF NOT FOUND THEN
            RAISE EXCEPTION 'El producto con ID % no fue encontrado.', salida_item->>'producto_id';
        END IF;

        -- Validar que hay suficiente stock para este item
        IF producto_record.stock_actual < (salida_item->>'cantidad')::integer THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto "%" (Lote: %). Stock disponible: %, Cantidad solicitada: %',
                producto_record.maestro_productos ->>'nombre', producto_record.numero_lote, producto_record.stock_actual, salida_item->>'cantidad';
        END IF;

        -- Validar que la cantidad no sea cero o negativa
        IF (salida_item->>'cantidad')::integer <= 0 THEN
            RAISE EXCEPTION 'La cantidad a retirar debe ser mayor que cero.';
        END IF;
    END LOOP;

    -- Segunda pasada: Si todas las validaciones son correctas, proceder con las actualizaciones
    FOR salida_item IN SELECT * FROM jsonb_array_elements(p_salidas)
    LOOP
        -- Actualizar el stock del lote
        UPDATE productos
        SET stock_actual = stock_actual - (salida_item->>'cantidad')::integer
        WHERE id = (salida_item->>'producto_id')::uuid;

        -- Registrar el movimiento de salida
        INSERT INTO movimientos (producto_id, usuario_id, tipo_movimiento, cantidad, motivo, condicion)
        VALUES ((salida_item->>'producto_id')::uuid, p_usuario_id, 'salida', (salida_item->>'cantidad')::integer, p_motivo, 'Bueno');
    END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;