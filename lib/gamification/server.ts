import type { SupabaseClient } from '@supabase/supabase-js';

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
}
