-- 20251020_speaking_teacher_feedback.sql
-- Adds optional teacher feedback fields to speaking_attempts.

alter table if exists public.speaking_attempts
  add column if not exists teacher_feedback text,
  add column if not exists teacher_feedback_by uuid references public.profiles(id) on delete set null,
  add column if not exists teacher_feedback_at timestamptz;

-- Allow staff roles to read speaking attempts for review purposes.
drop policy if exists "Staff read speaking_attempts" on public.speaking_attempts;
create policy "Staff read speaking_attempts"
  on public.speaking_attempts
  for select
  using (auth.jwt()->>'role' in ('teacher','admin'));
