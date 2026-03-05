alter table public.writing_readiness
  add constraint writing_readiness_user_unique unique (user_id);
