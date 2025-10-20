import type { SupabaseClient } from '@supabase/supabase-js';

import { trackor } from '@/lib/analytics/trackor.server';

export async function awardBadgeServer(
  client: SupabaseClient<any>,
  userId: string,
  badgeId: string,
) {
  const { error } = await client
    .from('user_badges')
    .upsert({ user_id: userId, badge_id: badgeId }, { onConflict: 'user_id,badge_id' });

  if (error) {
    throw new Error(error.message);
  }

  try {
    await trackor.log('badge_unlocked', { user_id: userId, badge_id: badgeId });
  } catch (err) {
    console.warn('[gamification.badge] analytics failed', err);
  }
}
