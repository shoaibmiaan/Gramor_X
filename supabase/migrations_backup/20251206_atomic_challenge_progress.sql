create or replace function public.increment_challenge_progress(
  p_user_id uuid,
  p_challenge_id uuid,
  p_now timestamptz,
  p_target int,
  p_reset_type text,
  p_time_zone text default 'Asia/Karachi'
)
returns table (
  progress_count int,
  total_mastered int,
  target int,
  last_incremented_at timestamptz,
  resets_at timestamptz,
  incremented boolean
)
language plpgsql
as $$
declare
  current_row public.user_challenge_progress%rowtype;
  effective_target int := nullif(p_target, 0);
  tz_now timestamp without time zone;
  next_reset_local timestamp without time zone;
begin
  select *
    into current_row
    from public.user_challenge_progress
   where user_id = p_user_id
     and challenge_id = p_challenge_id
   for update;

  if not found then
    current_row.user_id := p_user_id;
    current_row.challenge_id := p_challenge_id;
    current_row.progress_count := 0;
    current_row.total_mastered := 0;
    current_row.target := coalesce(effective_target, 0);
    current_row.resets_at := null;
    current_row.last_incremented_at := null;
  else
    effective_target := coalesce(current_row.target, effective_target);
  end if;

  if effective_target is null or effective_target <= 0 then
    raise exception 'challenge target must be positive';
  end if;

  tz_now := timezone(p_time_zone, p_now);

  if current_row.resets_at is null or current_row.resets_at <= p_now then
    current_row.progress_count := 0;
    if p_reset_type = 'weekly' then
      next_reset_local := date_trunc('week', tz_now) + interval '1 week';
    else
      next_reset_local := date_trunc('day', tz_now) + interval '1 day';
    end if;
    current_row.resets_at := (next_reset_local at time zone p_time_zone);
  end if;

  incremented := false;

  if current_row.progress_count < effective_target then
    current_row.progress_count := current_row.progress_count + 1;
    current_row.total_mastered := coalesce(current_row.total_mastered, 0) + 1;
    current_row.last_incremented_at := p_now;
    incremented := true;
  end if;

  current_row.target := effective_target;

  if current_row.id is null then
    insert into public.user_challenge_progress
      (user_id, challenge_id, progress_count, total_mastered, target, last_incremented_at, resets_at)
    values
      (current_row.user_id, current_row.challenge_id, current_row.progress_count, current_row.total_mastered,
       current_row.target, current_row.last_incremented_at, current_row.resets_at)
    returning progress_count, total_mastered, target, last_incremented_at, resets_at
      into progress_count, total_mastered, target, last_incremented_at, resets_at;
  else
    update public.user_challenge_progress
       set progress_count = current_row.progress_count,
           total_mastered = current_row.total_mastered,
           target = current_row.target,
           last_incremented_at = current_row.last_incremented_at,
           resets_at = current_row.resets_at,
           updated_at = now()
     where id = current_row.id
    returning progress_count, total_mastered, target, last_incremented_at, resets_at
      into progress_count, total_mastered, target, last_incremented_at, resets_at;
  end if;

  return next;
  return;
end;
$$;

grant execute on function public.increment_challenge_progress(uuid, uuid, timestamptz, int, text, text)
  to authenticated, service_role;
