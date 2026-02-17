// lib/challenge.ts
import { supabaseService } from "@/lib/supabaseServer";
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { createSignedAvatarUrl, isStoragePath } from '@/lib/avatar';
import {
  ChallengeEnrollment,
  ChallengeEnrollRequest,
  ChallengeEnrollResponse,
  ChallengeProgressUpdateRequest,
  ChallengeProgressResponse,
  ChallengeLeaderboardEntry,
  ChallengeLeaderboardResponse,
  ChallengeCohortId,
  ChallengeProgress,
} from "@/types/challenge";

/**
 * Enroll a user into a challenge cohort.
 */
export async function enrollInChallenge(
  userId: string,
  payload: ChallengeEnrollRequest,
): Promise<ChallengeEnrollResponse> {
  const client = supabaseService();
  const { data, error } = await client
    .from('challenge_enrollments')
    .insert({
      user_id: userId,
      cohort: payload.cohort,
    })
    .select('*')
    .single();

  if (error) return { ok: false, error: error.message };

  const enrollment: ChallengeEnrollment = {
    id: data.id,
    userId: data.user_id,
    cohort: data.cohort,
    enrolledAt: data.enrolled_at,
    progress: data.progress || {},
    completed: data.completed,
    certificateId: data.certificate_id ?? undefined,
  };

  return { ok: true, enrollment };
}

/**
 * Update challenge progress for a specific day.
 */
export async function updateChallengeProgress(
  userId: string,
  payload: ChallengeProgressUpdateRequest,
): Promise<ChallengeProgressResponse> {
  const client = supabaseService();
  const { data: enrollment, error: fetchErr } = await client
    .from('challenge_enrollments')
    .select('id, progress')
    .eq('id', payload.enrollmentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchErr || !enrollment) {
    return { ok: false, error: fetchErr?.message || "Enrollment not found" };
  }

  // Update JSONB progress
  const updatedProgress: ChallengeProgress = {
    ...enrollment.progress,
    [`day${payload.day}`]: payload.status,
  };

  const { error: updateErr } = await client
    .from('challenge_enrollments')
    .update({ progress: updatedProgress })
    .eq('id', payload.enrollmentId)
    .eq('user_id', userId);

  if (updateErr) return { ok: false, error: updateErr.message };

  return { ok: true, progress: updatedProgress };
}

/**
 * Fetch leaderboard for a cohort.
 */
async function loadSnapshotLeaderboard(
  cohort: ChallengeCohortId,
): Promise<ChallengeLeaderboardEntry[] | null> {
  const client = supabaseService();
  const { data: snapshot, error: snapshotErr } = await client
    .from('mock_reading_leaderboard_snapshots')
    .select('snapshot_date')
    .eq('cohort', cohort)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapshotErr) {
    throw snapshotErr;
  }

  const snapshotDate = snapshot?.snapshot_date;
  const snapshotIso = snapshotDate
    ? typeof snapshotDate === 'string'
      ? snapshotDate
      : new Date(snapshotDate).toISOString()
    : null;
  if (!snapshotDate) {
    return null;
  }

  const { data, error } = await client
    .from('mock_reading_leaderboard_snapshots')
    .select('user_id, rank, xp, completed_tasks, total_tasks, profiles(full_name, avatar_url)')
    .eq('cohort', cohort)
    .eq('snapshot_date', snapshotDate)
    .order('rank', { ascending: true })
    .limit(50);

  if (error) {
    throw error;
  }

  const rows = Array.isArray(data) ? data : [];

  const leaderboard: ChallengeLeaderboardEntry[] = [];
  for (const row of rows) {
    const rawAvatar: string | null = row?.profiles?.avatar_url ?? null;
    let avatarUrl: string | undefined;
    if (typeof rawAvatar === 'string') {
      if (isStoragePath(rawAvatar)) {
        try {
          avatarUrl = (await createSignedAvatarUrl(rawAvatar)) ?? undefined;
        } catch (error) {
          console.warn('[challenge] failed to sign avatar', error);
        }
      } else {
        avatarUrl = rawAvatar;
      }
    }

    leaderboard.push({
      userId: row?.user_id,
      fullName: row?.profiles?.full_name || 'Anonymous',
      avatarUrl,
      completedTasks: Number(row?.completed_tasks ?? 0),
      totalTasks: Number(row?.total_tasks ?? 7),
      rank: Number(row?.rank ?? leaderboard.length + 1),
      xp: Number(row?.xp ?? 0),
      snapshotDate: snapshotIso ?? undefined,
    });
  }

  return leaderboard.length ? leaderboard : null;
}

export async function getChallengeLeaderboard(
  cohort: ChallengeCohortId,
): Promise<ChallengeLeaderboardResponse> {
  try {
    const snapshot = await loadSnapshotLeaderboard(cohort);
    if (snapshot && snapshot.length) {
      return { ok: true, cohort, leaderboard: snapshot };
    }
  } catch (error) {
    console.warn('[challenge] snapshot leaderboard fallback', error);
  }

  const client = supabaseService();
  const { data, error } = await client
    .from('challenge_enrollments')
    .select('user_id, progress, profiles(full_name, avatar_url)')
    .eq('cohort', cohort);

  if (error) return { ok: false, error: error.message };

  const leaderboard: ChallengeLeaderboardEntry[] = await Promise.all(
    (data ?? []).map(async (row: any, idx: number) => {
      const progress: ChallengeProgress = row.progress || {};
      const completedTasks = Object.values(progress).filter((s) => s === 'done').length;
      const totalTasks = Object.keys(progress).length || 14;

      const rawAvatar: string | null = row.profiles?.avatar_url ?? null;
      let avatarUrl: string | undefined;
      if (typeof rawAvatar === 'string') {
        if (isStoragePath(rawAvatar)) {
          try {
            avatarUrl = (await createSignedAvatarUrl(rawAvatar)) ?? undefined;
          } catch (error) {
            console.warn('Failed to sign leaderboard avatar', error);
            avatarUrl = undefined;
          }
        } else {
          avatarUrl = rawAvatar;
        }
      }

      return {
        userId: row.user_id,
        fullName: row.profiles?.full_name || 'Anonymous',
        avatarUrl,
        completedTasks,
        totalTasks,
        rank: idx + 1,
      };
    }),
  );

  leaderboard.sort((a, b) => b.completedTasks - a.completedTasks);
  leaderboard.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  return { ok: true, cohort, leaderboard };
}

/**
 * Mark enrollment as completed and attach certificate.
 */
export async function completeChallenge(
  enrollmentId: string,
  certificateId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseBrowser
    .from("challenge_enrollments")
    .update({ completed: true, certificate_id: certificateId })
    .eq("id", enrollmentId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
