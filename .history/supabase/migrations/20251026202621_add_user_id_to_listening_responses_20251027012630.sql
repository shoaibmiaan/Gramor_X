-- Add user_id column
alter table public.listening_responses
add column if not exists user_id uuid
references auth.users(id)
on delete cascade
not null default auth.uid();

-- Re-apply the missing policy (wrapped to skip if exists)
do $$  
begin
  create policy "Students manage own listening_responses"
    on public.listening_responses
    for all to authenticated
    using (auth.uid() = user_id and (auth.jwt()->>'role')::text in ('student','teacher'))
    with check (auth.uid() = user_id and (auth.jwt()->>'role')::text in ('student','teacher'));
exception when duplicate_object then null;
end   $$;