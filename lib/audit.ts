import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

export async function logAccountAudit(
  supabase: SupabaseClient<Database>,
  userId: string,
  action: string,
  metadata: Record<string, unknown> = {},
  extras?: { ip?: string | null; userAgent?: string | null },
) {
  try {
    await supabase.from('account_audit_log').insert({
      user_id: userId,
      action,
      metadata,
      ip_address: extras?.ip ?? null,
      user_agent: extras?.userAgent ?? null,
    });
  } catch (error) {
    console.error('Failed to write account audit log', error);
  }
}
