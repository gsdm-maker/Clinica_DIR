-- Enable RLS on movimientos table if not already enabled
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies that might conflict with function inserts (optional, use with caution)
-- DROP POLICY IF EXISTS "Allow all authenticated users to insert movements" ON public.movimientos;

-- Create a new RLS policy to allow inserts for authenticated users
CREATE POLICY "Allow authenticated users to insert movements via function" ON public.movimientos
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Optionally, if you have other policies, ensure they don't block this function.
-- For example, if you have a policy that only allows users to insert their own movements,
-- you might need to adjust it or create a bypass for the function if it inserts for other users.
