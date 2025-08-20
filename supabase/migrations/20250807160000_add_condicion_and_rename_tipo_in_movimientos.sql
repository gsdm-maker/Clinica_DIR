-- Rename the 'tipo' column to 'tipo_movimiento' in the 'movimientos' table
ALTER TABLE public.movimientos
RENAME COLUMN tipo TO tipo_movimiento;