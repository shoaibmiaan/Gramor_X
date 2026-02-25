create index if not exists user_bookmarks_user_created_idx
  on public.user_bookmarks (user_id, created_at desc);
