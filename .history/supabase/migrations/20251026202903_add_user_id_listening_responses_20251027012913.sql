-- Add missing user_id column (with backfill if data exists)
alter table public.listening_responses
add column if not exists user_id uuid
references auth.users(id) on delete cascade;

-- Backfill existing rows (adjust if user_id source differs; assumes linking via another table like responses)
update public.listening_responses
set user_id = (select user_id from some_related_table where id = listening_responses.some_id)
where user_id is null;  -- Replace with actual backfill logic if needed

-- Make non-nullable if appropriate
alter table public.listening_responses
alter column user_id set not null;

-- Re-apply the policy safely
do $$  
begin
  drop policy if exists "Students manage own listening_responses" on public.listening_responses;
  create policy "Students manage own listening_responses"
    on public.listening_responses
    for all to authenticated
    using (auth.uid() = user_id and (auth.jwt()->>'role')::text in ('student','teacher'))
    with check (auth.uid() = user_id and (auth.jwt()->>'role')::text in ('student','teacher'));
exception when others then null;
end   $$;