-- 1. Add the new proveedor_id column
ALTER TABLE public.productos
ADD COLUMN proveedor_id UUID;

-- 2. Add the foreign key constraint
ALTER TABLE public.productos
ADD CONSTRAINT fk_proveedor
FOREIGN KEY (proveedor_id)
REFERENCES public.proveedores(id)
ON DELETE SET NULL; -- Or ON DELETE RESTRICT if a provider should not be deleted if linked to a product

-- 3. Drop the old proveedor column
ALTER TABLE public.productos
DROP COLUMN proveedor;
