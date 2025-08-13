-- Add the 'condicion' column to the 'movimientos' table
ALTER TABLE public.movimientos
ADD COLUMN condicion TEXT NOT NULL DEFAULT 'Bueno';

-- Rename the 'tipo' column to 'tipo_movimiento' in the 'movimientos' table
ALTER TABLE public.movimientos
RENAME COLUMN tipo TO tipo_movimiento;