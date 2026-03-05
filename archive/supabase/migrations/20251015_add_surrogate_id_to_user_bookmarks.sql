-- Add surrogate UUID id to user_bookmarks + sane uniqueness
create extension if not exists "pgcrypto";

alter table if exists public.user_bookmarks
  add column if not exists id uuid default gen_random_uuid();

update public.user_bookmarks
set id = coalesce(id, gen_random_uuid())
where id is null;

alter table if exists public.user_bookmarks
  alter column id set not null;

alter table if exists public.user_bookmarks
  drop constraint if exists user_bookmarks_pkey;

alter table if exists public.user_bookmarks
  add primary key (id);

-- Keep logical uniqueness by user & resource triple
drop index if exists user_bookmarks_user_resource_idx;
create unique index if not exists user_bookmarks_user_resource_idx
  on public.user_bookmarks (user_id, resource_id, type);

comment on column public.user_bookmarks.id is 'Surrogate primary key for saved items API';
