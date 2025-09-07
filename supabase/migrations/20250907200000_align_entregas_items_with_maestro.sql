-- Aligns the 'entregas_items' table with the master product catalog.
-- This migration changes the foreign key to point to 'maestro_productos' instead of 'productos',
-- reflecting that medication deliveries are independent of specific batches.

-- 1. Drop the existing foreign key constraint from 'entregas_items'
ALTER TABLE public.entregas_items
DROP CONSTRAINT IF EXISTS entregas_items_producto_id_fkey;

-- 2. Rename the 'producto_id' column to 'maestro_producto_id'
ALTER TABLE public.entregas_items
RENAME COLUMN producto_id TO maestro_producto_id;

-- 3. Add the new foreign key constraint to reference 'maestro_productos'
ALTER TABLE public.entregas_items
ADD CONSTRAINT entregas_items_maestro_producto_id_fkey
FOREIGN KEY (maestro_producto_id) REFERENCES public.maestro_productos(id) ON DELETE RESTRICT;

-- 4. Clean up old indexes and create a new one for the renamed column
DROP INDEX IF EXISTS public.idx_entregas_items_producto_id;
CREATE INDEX IF NOT EXISTS idx_entregas_items_maestro_producto_id ON public.entregas_items USING btree (maestro_producto_id);
