-- Ensure RLS exists
alter table public.profiles enable row level security;

-- Policy: a user can read/update only their own profile
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
on public.profiles for update
using (auth.uid() = id)
with check (
  auth.uid() = id
  and coalesce(new.teacher_approved, false) = coalesce(old.teacher_approved, false) -- cannot self-approve
);

-- Optional: only admins can set teacher_approved=true (enforced app-side too)
