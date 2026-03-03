-- Phase 8: Global SaaS readiness

create table if not exists public.plans (
  id text primary key,
  name text not null,
  description text,
  price_monthly numeric(10,2),
  price_yearly numeric(10,2),
  lifetime_price numeric(10,2),
  features jsonb not null default '[]'::jsonb,
  stripe_price_monthly_id text,
  stripe_price_yearly_id text,
  stripe_price_lifetime_id text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plans add column if not exists description text;
alter table public.plans add column if not exists price_monthly numeric(10,2);
alter table public.plans add column if not exists price_yearly numeric(10,2);
alter table public.plans add column if not exists lifetime_price numeric(10,2);
alter table public.plans add column if not exists features jsonb not null default '[]'::jsonb;
alter table public.plans add column if not exists stripe_price_monthly_id text;
alter table public.plans add column if not exists stripe_price_yearly_id text;
alter table public.plans add column if not exists stripe_price_lifetime_id text;
alter table public.plans add column if not exists sort_order integer not null default 0;
alter table public.plans add column if not exists is_active boolean not null default true;
alter table public.plans add column if not exists created_at timestamptz not null default now();
alter table public.plans add column if not exists updated_at timestamptz not null default now();

insert into public.plans (
  id,name,description,price_monthly,price_yearly,lifetime_price,features,sort_order,is_active
)
values
  ('starter','Starter','Build consistency',5.99,59.99,null,'["Daily vocab", "Basic analytics"]'::jsonb,10,true),
  ('booster','Booster','Fast-track IELTS improvement',9.99,99.99,null,'["AI feedback", "Mock tests", "Insights"]'::jsonb,20,true),
  ('master','Master','Advanced + coaching',14.99,149.99,399.00,'["Priority support", "Teacher tools", "Exports"]'::jsonb,30,true),
  ('enterprise','Enterprise','Custom contract and invoicing',null,null,null,'["SLA", "Dedicated support", "PO invoicing"]'::jsonb,40,true)
on conflict (id) do update
set
  name=excluded.name,
  description=excluded.description,
  price_monthly=excluded.price_monthly,
  price_yearly=excluded.price_yearly,
  lifetime_price=excluded.lifetime_price,
  features=excluded.features,
  sort_order=excluded.sort_order,
  is_active=excluded.is_active,
  updated_at=now();

create index if not exists idx_plans_active_sort on public.plans (is_active, sort_order asc);

alter table public.plans enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='plans' and policyname='plans_public_select') then
    create policy plans_public_select on public.plans
      for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='plans' and policyname='plans_admin_write') then
    create policy plans_admin_write on public.plans
      for all using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

create table if not exists public.enterprise_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  company text,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_enterprise_inquiries_created_at on public.enterprise_inquiries (created_at desc);

alter table public.enterprise_inquiries enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='enterprise_inquiries' and policyname='enterprise_inquiries_user_insert') then
    create policy enterprise_inquiries_user_insert on public.enterprise_inquiries
      for insert with check (auth.uid() = user_id or auth.uid() is null);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='enterprise_inquiries' and policyname='enterprise_inquiries_admin_select') then
    create policy enterprise_inquiries_admin_select on public.enterprise_inquiries
      for select using (public.is_admin());
  end if;
end $$;

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_url text,
  start_date date not null,
  end_date date not null,
  terms text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists idx_contracts_user_dates on public.contracts (user_id, start_date, end_date);

alter table public.contracts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='contracts' and policyname='contracts_user_select_own') then
    create policy contracts_user_select_own on public.contracts
      for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='contracts' and policyname='contracts_admin_all') then
    create policy contracts_admin_all on public.contracts
      for all using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;
