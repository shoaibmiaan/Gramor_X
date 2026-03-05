create table if not exists public.admin_promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  description text not null,
  type text not null check (type in ('percent','flat')),
  value integer not null check (value >= 0),
  applies_plans text[] default '{}',
  applies_cycles text[] default '{}',
  applies_methods text[] default '{}',
  stackable_with_referral boolean default false,
  notes text,
  is_active boolean default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists admin_promo_codes_code_idx on public.admin_promo_codes (code);

create trigger set_admin_promo_codes_updated_at
  before update on public.admin_promo_codes
  for each row
  execute function public.set_updated_at();

alter table public.admin_promo_codes enable row level security;

create policy if not exists admin_promo_codes_select on public.admin_promo_codes
  for select
  using (true);

create policy if not exists admin_promo_codes_manage on public.admin_promo_codes
  for all
  using (auth.jwt()->>'role' = 'admin')
  with check (auth.jwt()->>'role' = 'admin');
