-- 20251026_create_orgs.sql
-- Organizations + membership tables with role-based RLS helpers.

set check_function_bodies = off;

create extension if not exists "uuid-ossp";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger if not exists organizations_set_updated
  before update on public.organizations
  for each row execute procedure public.set_updated_at();

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index if not exists organization_members_user_idx on public.organization_members(user_id);
create index if not exists organization_members_org_idx on public.organization_members(org_id);

create trigger if not exists organization_members_set_updated
  before update on public.organization_members
  for each row execute procedure public.set_updated_at();

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','member')),
  token text not null unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  unique (org_id, email)
);

create index if not exists organization_invites_email_idx on public.organization_invites(lower(email));
create unique index if not exists organization_invites_unique_email on public.organization_invites(org_id, lower(email));

alter table if exists public.organizations enable row level security;
alter table if exists public.organization_members enable row level security;
alter table if exists public.organization_invites enable row level security;

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.org_id = org
      and m.user_id = auth.uid()
  );
$$;

grant execute on function public.is_org_member(uuid) to authenticated;


create or replace function public.is_org_admin(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.org_id = org
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  );
$$;

grant execute on function public.is_org_admin(uuid) to authenticated;

create or replace function public.is_org_owner(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id = org
      and o.owner_id = auth.uid()
  );
$$;

grant execute on function public.is_org_owner(uuid) to authenticated;

create policy "members can read orgs"
  on public.organizations
  for select
  using (public.is_org_member(id));

create policy "owners manage orgs"
  on public.organizations
  for all
  to authenticated
  using (public.is_org_owner(id))
  with check (public.is_org_owner(id));

create policy "owners create orgs"
  on public.organizations
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "members read memberships"
  on public.organization_members
  for select
  using (public.is_org_member(org_id));

create policy "owners manage memberships"
  on public.organization_members
  for all
  to authenticated
  using (public.is_org_admin(org_id))
  with check (
    public.is_org_admin(org_id)
    or (
      role = 'owner'
      and user_id = auth.uid()
      and exists (
        select 1 from public.organizations o
        where o.id = org_id and o.owner_id = auth.uid()
      )
    )
  );

create policy "owners invite members"
  on public.organization_invites
  for insert
  to authenticated
  with check (public.is_org_admin(org_id));

create policy "owners read invites"
  on public.organization_invites
  for select
  using (public.is_org_admin(org_id));

create policy "owners delete invites"
  on public.organization_invites
  for delete
  using (public.is_org_admin(org_id));

alter table if exists public.profiles
  add column if not exists active_org_id uuid references public.organizations(id);

create index if not exists profiles_active_org_idx on public.profiles(active_org_id);

comment on column public.profiles.active_org_id is 'Current organization context for multi-tenant teacher mode.';

