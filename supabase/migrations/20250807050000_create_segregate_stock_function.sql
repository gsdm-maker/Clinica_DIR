
CREATE OR REPLACE FUNCTION segregate_stock(
    p_producto_id uuid,
    p_cantidad_a_mover INT,
    p_condicion_origen TEXT,
    p_condicion_destino TEXT
)
RETURNS VOID AS $
DECLARE
    v_source_product_row public.productos;
    v_destination_product_id uuid;
    v_new_stock_source INT;
BEGIN
    -- 1. Get the source product row and check stock
    SELECT * INTO v_source_product_row
    FROM public.productos
    WHERE id = p_producto_id AND condicion = p_condicion_origen;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto con ID % y condición % no encontrado.', p_producto_id, p_condicion_origen;
    END IF;

    IF v_source_product_row.stock_actual < p_cantidad_a_mover THEN
        RAISE EXCEPTION 'No hay suficiente stock en la condición % para mover. Stock disponible: %', p_condicion_origen, v_source_product_row.stock_actual;
    END IF;

    -- 2. Reduce source stock
    v_new_stock_source := v_source_product_row.stock_actual - p_cantidad_a_mover;

    IF v_new_stock_source > 0 THEN
        UPDATE public.productos
        SET stock_actual = v_new_stock_source
        WHERE id = p_producto_id;
    ELSE
        DELETE FROM public.productos
        WHERE id = p_producto_id;
    END IF;

    -- 3. Find or create destination product row
    -- Try to find an existing product row with the destination condition
    SELECT id INTO v_destination_product_id
    FROM public.productos
    WHERE maestro_producto_id = v_source_product_row.maestro_producto_id
      AND numero_lote = v_source_product_row.numero_lote
      AND condicion = p_condicion_destino;

    IF FOUND THEN
        -- Update existing destination product row
        UPDATE public.productos
        SET stock_actual = stock_actual + p_cantidad_a_mover
        WHERE id = v_destination_product_id;
    ELSE
        -- Insert a new product row for the destination condition
        INSERT INTO public.productos (
            id,
            maestro_producto_id,
            proveedor_id,
            stock_actual,
            numero_lote,
            fecha_vencimiento,
            condicion,
            observaciones,
            bloqueado,
            fecha_ingreso,
            creado_en,
            actualizado_en
        ) VALUES (
            gen_random_uuid(),
            v_source_product_row.maestro_producto_id,
            v_source_product_row.proveedor_id,
            p_cantidad_a_mover,
            v_source_product_row.numero_lote,
            v_source_product_row.fecha_vencimiento,
            p_condicion_destino,
            v_source_product_row.observaciones,
            v_source_product_row.bloqueado,
            v_source_product_row.fecha_ingreso,
            NOW(),
            NOW()
        );
    END IF;

    -- 4. Record movements (for auditing)
    INSERT INTO public.movimientos (producto_id, tipo_movimiento, cantidad, creado_en, condicion)
    VALUES (v_source_product_row.id, 'salida', p_cantidad_a_mover, NOW(), p_condicion_origen);

    INSERT INTO public.movimientos (producto_id, tipo_movimiento, cantidad, creado_en, condicion)
    VALUES (v_source_product_row.id, 'entrada', p_cantidad_a_mover, NOW(), p_condicion_destino);

END;
$ LANGUAGE plpgsql;
