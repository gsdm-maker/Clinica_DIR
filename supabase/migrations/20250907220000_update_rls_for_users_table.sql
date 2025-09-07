-- This migration updates the Row Level Security (RLS) policy for the public.users table.
-- The previous policy only allowed users to view their own data, which prevented the delivery history
-- from showing the names of other users who made entries.
-- This new policy allows any authenticated user to view the list of all users, which is necessary
-- to resolve user IDs to names in the UI.

-- Drop the old, more restrictive policy
DROP POLICY IF EXISTS "Allow users to view their own data" ON public.users;

-- Create a new policy that allows any authenticated user to read from the users table
CREATE POLICY "Allow authenticated users to view all users" 
ON public.users 
FOR SELECT 
TO authenticated 
USING (true);
