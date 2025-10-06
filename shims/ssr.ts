import { createClient } from '@supabase/supabase-js';

// loose type to satisfy any incidental type imports
export type CookieOptions = any;

/** Minimal no-SSR replacement for @supabase/ssr.createServerClient */
export function createServerClient(url: string, anon: string, _opts?: any) {
  // No cookie adapter; callers should pass Authorization header from the client.
  return createClient(url, anon);
}
