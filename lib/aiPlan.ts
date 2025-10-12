import type { Profile, AIPlan } from '@/types/profile';
import { PREFS, TOPICS, DAILY_QUOTA_RANGE } from '@/lib/profile-options';

const DEFAULT_TOPICS = TOPICS.slice(0, 4);

function sanitizeQuota(value: number | null | undefined): number {
  if (!Number.isFinite(value ?? NaN)) return 4;
  const coerced = Math.round(Number(value));
  return Math.min(DAILY_QUOTA_RANGE.max, Math.max(DAILY_QUOTA_RANGE.min, coerced));
}

/**
 * Generate an AI plan for a learner. Weaknesses are prioritized
 * at the start of the returned sequence. If no preferences are
 * provided the full PREFS list is used.
 */
export function generateAIPlan(profile: Profile): AIPlan {
  const base = profile.study_prefs?.length ? [...profile.study_prefs] : [...PREFS];
  const weaknesses = profile.weaknesses ?? [];

  // Move weaknesses to the front while preserving their relative order
  const prioritized = [...base];
  weaknesses.forEach((w) => {
    const idx = prioritized.indexOf(w);
    if (idx > 0) {
      prioritized.splice(idx, 1);
      prioritized.unshift(w);
    }
  });

  const topics = (profile.focus_topics ?? []).filter((topic): topic is string => Boolean(topic?.trim()));
  const normalizedTopics = topics.length ? topics : DEFAULT_TOPICS;
  const dailyQuota = sanitizeQuota(profile.daily_quota_goal ?? null);

  const sessionMix = Array.from({ length: dailyQuota }, (_, index) => ({
    skill: prioritized[index % prioritized.length],
    topic: normalizedTopics[index % normalizedTopics.length],
  }));

  return {
    sequence: prioritized,
    dailyQuota,
    sessionMix,
    notes: [
      `Daily target: ${dailyQuota} activities`,
      `Focus topics: ${normalizedTopics.join(', ')}`,
      `Focus order: ${prioritized.join(' → ')}`,
    ],
    source: 'local',
  };
}

