
drop function if exists get_users();
create or replace function get_users()
returns table (
  id uuid,
  email text,
  name text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language sql
security definer
as $
  select
    id,
    email,
    coalesce(raw_user_meta_data->>'name', '') as name,
    coalesce(raw_user_meta_data->>'role', role, '') as role,
    created_at,
    last_sign_in_at
  from auth.users;
$;

grant execute on function get_users() to authenticated;
