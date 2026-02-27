// lib/supabaseService.ts
import { env } from '@/lib/env';
import { supabaseService as createSupabaseService } from '@/lib/supabaseServer';
import type { Database } from '@/types/supabase';

/**
 * Shared singleton Supabase client backed by the service role key.
 *
 * Historically this module constructed its own client using only the
 * `SUPABASE_SERVICE_ROLE_KEY`. That caused issues in environments where the
 * service credential is exposed under `SUPABASE_SERVICE_KEY` (such as the
 * background worker deployment) and resulted in silent 500s for checkout
 * intent creation.
 *
 * We now reuse the server helper which already handles key fallbacks and lazy
 * instantiation, ensuring consistent behaviour across API routes.
 */
export const supabaseService = createSupabaseService<Database>();

// Comma-separated admin emails
export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const raw = env.ADMIN_EMAILS || '';
  const list = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}
