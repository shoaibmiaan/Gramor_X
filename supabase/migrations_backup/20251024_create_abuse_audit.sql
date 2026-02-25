create table if not exists api_abuse_log (
  id bigserial primary key,
  user_id uuid,
  route text not null,
  hits integer not null default 0,
  window text not null default 'unspecified',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists api_abuse_log_route_idx on api_abuse_log (route, created_at desc);
create index if not exists api_abuse_log_user_idx on api_abuse_log (user_id, created_at desc);
