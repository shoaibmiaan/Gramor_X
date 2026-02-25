create table if not exists api_audit (
  id bigserial primary key,
  user_id uuid,
  route text not null,
  status integer not null,
  latency_ms integer,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists api_audit_route_idx on api_audit (route, created_at desc);
create index if not exists api_audit_user_idx on api_audit (user_id, created_at desc);
