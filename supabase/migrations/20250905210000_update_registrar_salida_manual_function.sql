-- First, drop the old function to replace it
DROP FUNCTION IF EXISTS registrar_salida_manual(uuid, text, jsonb);

-- Recreate the function with corrected logic
CREATE OR REPLACE FUNCTION registrar_salida_manual(
    p_usuario_id uuid,
    p_motivo text,
    p_salidas jsonb -- Expected format: [{"producto_id": "...", "cantidad": ..., "condicion": "..."}]
)
RETURNS void AS $$
DECLARE
    salida_item jsonb;
    v_stock_disponible BIGINT;
BEGIN
    -- Ensure the array is not empty
    IF jsonb_array_length(p_salidas) = 0 THEN
        RAISE EXCEPTION 'La lista de salidas no puede estar vacía.';
    END IF;

    -- 1. Validation Pass: Check all items before making any changes
    FOR salida_item IN SELECT * FROM jsonb_array_elements(p_salidas)
    LOOP
        -- Check for required fields
        IF NOT (salida_item ? 'producto_id' AND salida_item ? 'cantidad' AND salida_item ? 'condicion') THEN
            RAISE EXCEPTION 'Cada item de salida debe tener "producto_id", "cantidad" y "condicion".';
        END IF;

        -- Get current stock for the specific product and condition
        SELECT COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'entrada' THEN m.cantidad ELSE -m.cantidad END), 0)
        INTO v_stock_disponible
        FROM public.movimientos m
        WHERE m.producto_id = (salida_item->>'producto_id')::uuid
          AND m.condicion = (salida_item->>'condicion')::text;

        -- Validate stock
        IF v_stock_disponible < (salida_item->>'cantidad')::bigint THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto con ID % y condición %. Stock disponible: %, Cantidad solicitada: %',
                salida_item->>'producto_id', salida_item->>'condicion', v_stock_disponible, salida_item->>'cantidad';
        END IF;

        -- Validate quantity
        IF (salida_item->>'cantidad')::bigint <= 0 THEN
            RAISE EXCEPTION 'La cantidad a retirar debe ser mayor que cero.';
        END IF;
    END LOOP;

    -- 2. Insertion Pass: If all validations passed, insert the movements
    FOR salida_item IN SELECT * FROM jsonb_array_elements(p_salidas)
    LOOP
        -- Record the dispatch movement
        INSERT INTO public.movimientos (producto_id, usuario_id, tipo_movimiento, cantidad, motivo, condicion)
        VALUES (
            (salida_item->>'producto_id')::uuid,
            p_usuario_id,
            'salida',
            (salida_item->>'cantidad')::integer,
            p_motivo,
            (salida_item->>'condicion')::text
        );
    END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;