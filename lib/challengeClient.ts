import { supabaseBrowser } from '@/lib/supabaseBrowser';
import type { ChallengeTaskStatus } from '@/types/challenge';

export type ChallengeEnrollmentSummary = {
  id: string;
  cohort: string;
  progress: Record<string, ChallengeTaskStatus> | null;
  enrolledAt: string | null;
};

function mapEnrollmentRow(row: any): ChallengeEnrollmentSummary {
  return {
    id: String(row?.id ?? ''),
    cohort: String(row?.cohort ?? ''),
    progress: (row?.progress as Record<string, ChallengeTaskStatus> | null) ?? null,
    enrolledAt: row?.enrolled_at ? String(row.enrolled_at) : null,
  };
}

export async function fetchChallengeEnrollments(userId: string): Promise<ChallengeEnrollmentSummary[]> {
  const { data, error } = await supabaseBrowser
    .from('challenge_enrollments')
    .select('id, cohort, progress, enrolled_at')
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.map(mapEnrollmentRow);
}

export async function fetchLatestChallengeEnrollment(
  userId: string,
): Promise<ChallengeEnrollmentSummary | null> {
  const { data, error } = await supabaseBrowser
    .from('challenge_enrollments')
    .select('id, cohort, progress, enrolled_at')
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row ? mapEnrollmentRow(row) : null;
}
