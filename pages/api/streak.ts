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

    let shieldTokens = 0;
    try {
      const { data: shieldRow } = await supabaseUser
        .from('streak_shields')
        .select('tokens')
        .eq('user_id', user.id)
        .maybeSingle();
      shieldTokens = shieldRow?.tokens ?? 0;
    } catch (shieldErr) {
      console.warn('[API/streak] Unable to load shields', shieldErr);
      shieldTokens = 0;
    }

    // Build response object (shields/next_restart_date are not stored on this table)
    const asResponse = (r: typeof row, shields = shieldTokens): StreakData => ({
      current_streak: r?.current_streak ?? 0,
      longest_streak: r?.longest_streak ?? r?.current_streak ?? 0,
      last_activity_date: r?.last_activity_date ?? null,
      next_restart_date: null,
      shields,
    });

    if (req.method === 'GET') {
      return res.status(200).json(asResponse(row));
    }

    if (req.method === 'POST') {
      const { action, date } = req.body as { action?: 'use' | 'claim' | 'schedule'; date?: string };

      const now = new Date();
      const today = getDayKey(now);
      const previousCurrent = row.current_streak ?? 0;

      if (action === 'claim') {
        const nextTokens = shieldTokens + 1;
        try {
          const { data: updatedShield, error: shieldErr } = await supabaseUser
            .from('streak_shields')
            .upsert({ user_id: user.id, tokens: nextTokens }, { onConflict: 'user_id' })
            .select('tokens')
            .single();
          if (shieldErr) throw shieldErr;
          shieldTokens = updatedShield?.tokens ?? nextTokens;
          await supabaseUser.from('streak_shield_logs').insert({ user_id: user.id, action: 'claim' });
        } catch (err) {
          console.error('[API/streak] Claim shield failed', err);
          return res.status(500).json({ error: 'Failed to claim shield' });
        }
        return res.status(200).json(asResponse(row, shieldTokens));
      }

      if (action === 'schedule') {
        if (!date) return res.status(400).json({ error: 'Date required for scheduling' });
        return res.status(200).json({ ...asResponse(row, shieldTokens), next_restart_date: date });
      }

      const spentShield = action === 'use';
      if (spentShield && shieldTokens <= 0) {
        return res.status(400).json({ error: 'No shields available' });
      }

      if (!spentShield && row.last_activity_date === today) {
        return res.status(200).json(asResponse(row, shieldTokens));
      }

      const lastTs = row.updated_at ? new Date(row.updated_at) : null;
      const within24h = lastTs ? now.getTime() - lastTs.getTime() <= ms(24) : false;

      let newCurrent = 1;
      if (spentShield) {
        newCurrent = previousCurrent + 1;
      } else if (within24h) {
        newCurrent = previousCurrent + 1;
      } else {
        newCurrent = 1;
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
        return res.status(200).json(asResponse(row, shieldTokens));
      }

      let tokensDelta = 0;
      if (spentShield) tokensDelta -= 1;
      if (newCurrent > previousCurrent && newCurrent % 7 === 0) tokensDelta += 1;

      let nextTokens = shieldTokens;
      if (tokensDelta !== 0) {
        nextTokens = Math.max(0, shieldTokens + tokensDelta);
        try {
          const { data: shieldRow, error: shieldUpdateErr } = await supabaseUser
            .from('streak_shields')
            .upsert({ user_id: user.id, tokens: nextTokens }, { onConflict: 'user_id' })
            .select('tokens')
            .single();
          if (shieldUpdateErr) {
            console.error('[API/streak] Failed to update shields', shieldUpdateErr);
          } else {
            nextTokens = shieldRow?.tokens ?? nextTokens;
          }
        } catch (shieldUpdateError) {
          console.error('[API/streak] Shield upsert failed', shieldUpdateError);
        }
      }

      if (spentShield) {
        await supabaseUser.from('streak_shield_logs').insert({ user_id: user.id, action: 'use' });
      }
      if (tokensDelta > 0) {
        await supabaseUser.from('streak_shield_logs').insert({ user_id: user.id, action: 'claim' });
      }

      return res.status(200).json(asResponse(updatedRow, nextTokens));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[API/streak] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}