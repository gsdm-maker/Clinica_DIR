-- Enable Row Level Security for the proveedores table
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read providers
DROP POLICY IF EXISTS "Allow authenticated users to read providers" ON public.proveedores;
CREATE POLICY "Allow authenticated users to read providers"
  ON public.proveedores
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Allow admin and bodega roles to manage providers
DROP POLICY IF EXISTS "Allow admin and bodega to manage providers" ON public.proveedores;
CREATE POLICY "Allow admin and bodega to manage providers"
  ON public.proveedores
  FOR ALL -- Covers INSERT, UPDATE, DELETE
  USING (public.is_admin() OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'bodega')
  WITH CHECK (public.is_admin() OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'bodega');
