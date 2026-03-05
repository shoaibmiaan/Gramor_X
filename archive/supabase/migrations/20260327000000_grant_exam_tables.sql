-- Grant DML privileges on exam tables for authenticated users.
-- Ensures students can create attempts and log events under RLS.

grant usage on schema public to authenticated;

grant select, insert, update on table public.exam_attempts to authenticated;
grant select, insert on table public.exam_events to authenticated;

