-- Ensure pgcrypto available for UUID generation
create extension if not exists "pgcrypto";

alter table public.user_bookmarks
  add column if not exists id uuid default gen_random_uuid();

update public.user_bookmarks
set id = coalesce(id, gen_random_uuid())
where id is null;

alter table public.user_bookmarks
  alter column id set not null;

alter table public.user_bookmarks
  drop constraint if exists user_bookmarks_pkey;

alter table public.user_bookmarks
  add primary key (id);

create unique index if not exists user_bookmarks_user_resource_idx
  on public.user_bookmarks (user_id, resource_id, type, category);

comment on column public.user_bookmarks.id is 'Surrogate primary key for saved items API';
