import { NextApiRequest, NextApiResponse } from 'next';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseService, supabaseServer } from '@/lib/supabaseServer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type StreakData = {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null; // YYYY-MM-DD
  next_restart_date: string | null;  // not persisted on 'streaks' table
  shields: number;                   // not persisted on 'streaks' table
};

const getDayKey = (d = new Date()) => d.toISOString().split('T')[0];
const ms = (h: number) => h * 60 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let token = req.headers.authorization?.split(' ')[1] ?? null;
  let refreshToken: string | null = null;

  if (!token) {
    try {
      const cookieClient = supabaseServer(req);
      const { data, error } = await cookieClient.auth.getSession();
      if (error) {
        console.error('[API/streak] Cookie session lookup failed:', error);
      }
      token = data?.session?.access_token ?? null;
      refreshToken = data?.session?.refresh_token ?? null;
    } catch (error) {
      console.error('[API/streak] Cookie session client unavailable:', error);
    }
  }

  if (!token) return res.status(401).json({ error: 'No authorization token' });

  // RLS client (acts as the user)
  let supabaseUser: SupabaseClient;
  try {
    supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch (error) {
    console.error('[API/streak] User client creation failed:', error);
    return res.status(503).json({ error: 'service_unavailable' });
  }

  try {
    await supabaseUser.auth.setSession({
      access_token: token,
      refresh_token: refreshToken ?? '',
    });
  } catch (error) {
    console.error('[API/streak] User session setup failed:', error);
    return res.status(503).json({ error: 'service_unavailable' });
  }

  let user = null;
  try {
    const { data: { user: authUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authUser) return res.status(401).json({ error: 'Invalid token' });
    user = authUser;
  } catch (error) {
    console.error('[API/streak] Auth verification failed:', error);
    return res.status(503).json({ error: 'auth_unavailable' });
  }

  try {
    // Read current row (aliases to expected keys)
    let { data: row, error: fetchError } = await supabaseUser
      .from('streaks')
      .select('user_id,current_streak:current,longest_streak:longest,last_activity_date:last_active_date,updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    // If no row, create one
    const baseInsert = { user_id: user.id, current: 0, longest: 0, last_active_date: null, updated_at: null };

    if (!row) {
      const { data: inserted, error: insertError } = await supabaseUser
        .from('streaks')
        .insert(baseInsert)
        .select('user_id,current_streak:current,longest_streak:longest,last_activity_date:last_active_date,updated_at')
        .single();
      if (insertError) {
        console.error('[API/streak] Insert failed:', insertError);

        const shouldRetryWithService =
          insertError?.code === '42501' || insertError?.message?.includes('row-level security');

        if (shouldRetryWithService) {
          try {
            const svc = supabaseService();
            const { data: serviceInserted, error: serviceErr } = await svc
              .from('streaks')
              .insert(baseInsert)
              .select('user_id,current_streak:current,longest_streak:longest,last_activity_date:last_active_date,updated_at')
              .single();

            if (serviceErr) {
              console.error('[API/streak] Service insert failed:', serviceErr);
            } else {
              row = serviceInserted ?? row;
            }
          } catch (serviceClientError) {
            console.error('[API/streak] Service client unavailable for insert:', serviceClientError);
          }
        }

        // Fallback: treat as new streak of 0 when all attempts fail
        if (!row) {
          row = {
            user_id: user.id,
            current_streak: 0,
            longest_streak: 0,
            last_activity_date: null,
            updated_at: null,
          } as typeof row;
        }
      } else {
        row = inserted;
      }
    }

    // Build response object (shields/next_restart_date are not stored on this table)
    const asResponse = (r: typeof row): StreakData => ({
      current_streak: r?.current_streak ?? 0,
      longest_streak: r?.longest_streak ?? r?.current_streak ?? 0,
      last_activity_date: r?.last_activity_date ?? null,
      next_restart_date: null,
      shields: 0,
    });

    if (req.method === 'GET') {
      return res.status(200).json(asResponse(row));
    }

    if (req.method === 'POST') {
      const { action, date } = req.body as { action?: 'use' | 'claim' | 'schedule'; date?: string };

      // Only the core “completion” flow affects the DB row in 'streaks'
      const now = new Date();
      const today = getDayKey(now);

      // If user already logged today, do nothing (prevents multiple increments per calendar day)
      if (!action) {
        const lastDay = row.last_activity_date;
        let newCurrent = 1;

        if (lastDay === today) {
          // already counted today
          return res.status(200).json(asResponse(row));
        }

        // Rolling 24h logic using updated_at timestamp (snapchat-style)
        const lastTs = row.updated_at ? new Date(row.updated_at) : null;
        if (lastTs && (now.getTime() - lastTs.getTime()) <= ms(24)) {
          newCurrent = (row.current_streak ?? 0) + 1; // within 24h -> increment
        } else {
          newCurrent = 1; // missed 24h -> reset
        }

        const previousLongest = row.longest_streak ?? row.current_streak ?? 0;
        const newLongest = Math.max(previousLongest, newCurrent);

        const { data: updatedRow, error: upErr } = await supabaseUser
          .from('streaks')
          .update({
            current: newCurrent,
            longest: newLongest,
            last_active_date: today,
            updated_at: now.toISOString(),
          })
          .eq('user_id', user.id)
          .select('user_id,current_streak:current,longest_streak:longest,last_activity_date:last_active_date,updated_at')
          .single();

        if (upErr) {
          console.error('[API/streak] Update failed:', upErr);
          // Fallback: return original row
          return res.status(200).json(asResponse(row));
        }
        return res.status(200).json(asResponse(updatedRow));
      }

      // The following actions are no-ops for 'streaks' storage (kept for compatibility)
      if (action === 'use') {
        // would spend a shield in a separate table; keep response consistent
        return res.status(200).json({ ...asResponse(row), shields: Math.max(0, (0 - 1)) });
      }
      if (action === 'claim') {
        return res.status(200).json({ ...asResponse(row), shields: 0 + 1 });
      }
      if (action === 'schedule') {
        if (!date) return res.status(400).json({ error: 'Date required for scheduling' });
        return res.status(200).json({ ...asResponse(row), next_restart_date: date });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[API/streak] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}