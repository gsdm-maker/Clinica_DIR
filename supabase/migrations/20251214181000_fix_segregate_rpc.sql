CREATE OR REPLACE FUNCTION segregate_stock(
    p_producto_id uuid,
    p_cantidad_a_mover integer,
    p_condicion_origen text,
    p_condicion_destino text,
    p_usuario_id uuid,
    p_motivo text
)
RETURNS void AS $$
DECLARE
    v_producto_origen RECORD;
    v_producto_destino_id uuid;
BEGIN
    -- 1. Get source product and lock row
    SELECT * INTO v_producto_origen FROM productos WHERE id = p_producto_id FOR UPDATE;

    IF v_producto_origen IS NULL THEN
        RAISE EXCEPTION 'Producto no encontrado';
    END IF;

    -- Validate consistency
    IF v_producto_origen.condicion != p_condicion_origen THEN
         RAISE EXCEPTION 'La condición actual del producto (%) no coincide con la condición de origen solicitada (%).', v_producto_origen.condicion, p_condicion_origen;
    END IF;

    IF v_producto_origen.stock_actual < p_cantidad_a_mover THEN
        RAISE EXCEPTION 'No hay suficiente stock físico en el producto seleccionado. Stock actual: %, Solicitado: %', v_producto_origen.stock_actual, p_cantidad_a_mover;
    END IF;

    -- 2. Subtract from source
    UPDATE productos 
    SET stock_actual = stock_actual - p_cantidad_a_mover,
        actualizado_en = NOW()
    WHERE id = p_producto_id;

    -- 3. Find or Create destination product (split lot)
    SELECT id INTO v_producto_destino_id
    FROM productos
    WHERE maestro_producto_id = v_producto_origen.maestro_producto_id
    AND numero_lote = v_producto_origen.numero_lote
    AND condicion = p_condicion_destino
    AND (fecha_vencimiento IS NOT DISTINCT FROM v_producto_origen.fecha_vencimiento)
    LIMIT 1;

    IF v_producto_destino_id IS NOT NULL THEN
        -- Update existing destination lot
        UPDATE productos 
        SET stock_actual = stock_actual + p_cantidad_a_mover,
            actualizado_en = NOW()
        WHERE id = v_producto_destino_id;
    ELSE
        -- Create new destination lot
        -- REMOVED stock_critico and descripcion as they are normalized out
        INSERT INTO productos (
            maestro_producto_id, 
            numero_lote, 
            fecha_vencimiento, 
            stock_actual, 
            condicion, 
            -- descripcion, <-- REMOVED
            proveedor_id, 
            fecha_ingreso, 
            bloqueado
        ) VALUES (
            v_producto_origen.maestro_producto_id,
            v_producto_origen.numero_lote,
            v_producto_origen.fecha_vencimiento,
            p_cantidad_a_mover,
            p_condicion_destino,
            -- v_producto_origen.descripcion, <-- REMOVED
            v_producto_origen.proveedor_id,
            NOW(),
            (p_condicion_destino IN ('Vencido', 'Cuarentena', 'Dañado'))
        ) RETURNING id INTO v_producto_destino_id;
    END IF;

    -- 4. Log Movements (Traceability)
    INSERT INTO movimientos (producto_id, tipo_movimiento, cantidad, creado_en, condicion, usuario_id, motivo)
    VALUES (p_producto_id, 'salida', p_cantidad_a_mover, NOW(), p_condicion_origen, p_usuario_id, p_motivo || ' (Segregación Salida)');

    INSERT INTO movimientos (producto_id, tipo_movimiento, cantidad, creado_en, condicion, usuario_id, motivo)
    VALUES (v_producto_destino_id, 'entrada', p_cantidad_a_mover, NOW(), p_condicion_destino, p_usuario_id, p_motivo || ' (Segregación Entrada)');

END;
$$ LANGUAGE plpgsql;
