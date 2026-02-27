-- function to detect password reuse

-- ensure pgcrypto is available for crypt()
create extension if not exists pgcrypto with schema public;

create or replace function public.password_is_reused(new_password text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  stored text;
begin
  -- read current user's hashed password from auth.users
  select encrypted_password into stored
  from auth.users
  where id = auth.uid();

  if stored is null then
    return false;
  end if;

  -- compare using pgcrypto's crypt()
  return stored = crypt(new_password, stored);
end;
$$;

grant execute on function public.password_is_reused(text) to authenticated;
