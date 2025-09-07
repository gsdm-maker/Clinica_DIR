-- This migration adds Row Level Security (RLS) policies to the 'entregas_items' table.
-- Previously, no policies existed, preventing any user from reading the items, which is why
-- the delivery history could not display the list of delivered medications.

-- 1. Enable Row Level Security on the table
ALTER TABLE public.entregas_items ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Allow ALL authenticated users to READ delivery items.
-- This is necessary for the history view to show what was delivered.
CREATE POLICY "Permitir lectura a usuarios autenticados"
ON public.entregas_items
FOR SELECT
TO authenticated
USING (true);

-- 3. Policy: Allow managing roles (admin, bodega, enfermero) to do EVERYTHING ELSE (INSERT, UPDATE, DELETE).
-- This single policy handles all write operations.
CREATE POLICY "Permitir gestion a roles autorizados"
ON public.entregas_items
FOR ALL -- "ALL" covers INSERT, UPDATE, and DELETE
TO authenticated
USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'bodega', 'enfermero'))
WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'bodega', 'enfermero'));