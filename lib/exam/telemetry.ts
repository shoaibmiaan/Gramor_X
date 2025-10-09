import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function getExamAttemptStart(attemptId: string): Promise<Date | null> {
  if (!attemptId) return null;

  const { data, error } = await supabaseAdmin
    .from('exam_events')
    .select('created_at')
    .eq('attempt_id', attemptId)
    .eq('event_type', 'start')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error || !data?.length) {
    return null;
  }

  const createdAt = data[0]?.created_at;
  return createdAt ? new Date(createdAt) : null;
}

export function calculateDurationSeconds(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  const diff = Math.max(0, end.getTime() - start.getTime());
  return Math.round(diff / 1000);
}
