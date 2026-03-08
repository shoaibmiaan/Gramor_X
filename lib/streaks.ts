import type { SupabaseClient } from '@supabase/supabase-js';
import { computeStreakUpdate, getDayKeyInTZ, updateStreak } from '@/lib/streak';

export const dayKey = (date: Date, tz: string) => getDayKeyInTZ(date, tz);

export { computeStreakUpdate };

export async function syncStreak(
  supabase: SupabaseClient,
  userId: string,
  tz = 'Asia/Karachi',
  now: Date = new Date(),
): Promise<number> {
  const streak = await updateStreak(supabase, userId, now);
  console.info('[syncStreak] correction', JSON.stringify({ userId, tz, to: streak.current_streak }));
  return streak.current_streak;
}
