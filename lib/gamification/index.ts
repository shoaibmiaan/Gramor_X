import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { badges, type Badge } from '@/data/badges';

export type UserBadge = {
  user_id: string;
  badge_id: string;
  created_at?: string;
};

/**
 * Fetch badge ids that a user has earned.
 */
export async function getUserBadges(userId: string): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId)
    .returns<Array<Pick<UserBadge, 'badge_id'>>>();
  if (error || !data) return [];
  const all = [...badges.streaks, ...badges.milestones, ...badges.community];
  return all.filter((b) => data.some((d) => d.badge_id === b.id));
}

/**
 * Award a badge to a user. Uses upsert to avoid duplicates.
 */
export async function awardBadge(userId: string, badgeId: string) {
  return supabase
    .from('user_badges')
    .upsert({ user_id: userId, badge_id: badgeId }, { onConflict: 'user_id,badge_id' });
}
