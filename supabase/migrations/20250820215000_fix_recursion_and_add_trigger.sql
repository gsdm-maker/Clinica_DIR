-- Step 1: Create a function to safely check for admin role without recursion.
-- The SECURITY DEFINER clause makes the function run with the permissions of the user who created it,
-- bypassing the RLS policy check for the internal query.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  is_admin_result boolean;
BEGIN
  SELECT (role = 'admin')
  INTO is_admin_result
  FROM public.users
  WHERE id = auth.uid();
  RETURN COALESCE(is_admin_result, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop the old, broken policy and create a new one using the safe function.
DROP POLICY IF EXISTS "Allow admin to manage all users" ON public.users;
CREATE POLICY "Allow admin to manage all users"
  ON public.users
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Step 3: Create the function and trigger to populate public.users on new sign-ups.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name', 'user'); -- Default role to 'user'
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user sign-up
-- Drop the trigger if it exists, to make this script re-runnable
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
