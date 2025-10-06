/** Local build-only shim to replace deprecated @supabase/auth-helpers-nextjs (no-SSR). */
import type { NextApiRequest, NextApiResponse } from "next";
type Any = any;

export function createPagesServerClient(_opts?: Any) {
  // Minimal shape used in code: .auth.getUser() / .auth.getSession()
  return {
    auth: {
      async getUser() { return { data: { user: null }, error: null }; },
      async getSession() { return { data: { session: null }, error: null }; },
    },
  } as Any;
}

export const createServerSupabaseClient = createPagesServerClient;
export function createMiddlewareClient(_req?: NextApiRequest, _res?: NextApiResponse) {
  return createPagesServerClient();
}
