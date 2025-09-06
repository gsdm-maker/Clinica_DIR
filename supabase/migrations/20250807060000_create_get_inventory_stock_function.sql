CREATE OR REPLACE FUNCTION get_inventory_stock()
RETURNS TABLE(
    id uuid,
    maestro_producto_id uuid,
    proveedor_id uuid,
    stock_actual integer,
    condicion text,
    maestro_productos json,
    proveedores json
) AS $
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.maestro_producto_id,
        p.proveedor_id,
        p.stock_actual,
        p.condicion,
        json_build_object(
            'id', mp.id,
            'nombre', mp.nombre,
            'categoria', mp.categoria,
            'stock_critico', mp.stock_critico
        ) as maestro_productos,
        json_build_object(
            'id', prov.id,
            'nombre', prov.nombre
        ) as proveedores
    FROM
        public.productos p
    JOIN
        public.maestro_productos mp ON p.maestro_producto_id = mp.id
    LEFT JOIN
        public.proveedores prov ON p.proveedor_id = prov.id;
END;
$ LANGUAGE plpgsql;