-- Helper: check if current user is admin
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

-- Allow admins to read/update any profile
drop policy if exists "profiles_admin_read" on public.profiles;
create policy "profiles_admin_read"
on public.profiles for select
using ( public.is_admin(auth.uid()) );

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
on public.profiles for update
using ( public.is_admin(auth.uid()) )
with check ( public.is_admin(auth.uid()) );
