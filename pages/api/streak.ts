// pages/api/streak.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Service role client (bypasses RLS, but we filter by user_id)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type StreakData = {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null; // YYYY-MM-DD
  next_restart_date: string | null;
  shields: number;
};

const getDayKey = (d = new Date()) => d.toISOString().split('T')[0];
const ms = (h: number) => h * 60 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'server_config_error' });
  }

  // Get token from Authorization header or fallback to cookie (optional)
  let token = req.headers.authorization?.split(' ')[1] ?? null;

  // If no token, try to get from cookie using a lightweight approach (optional)
  // This part can be omitted if your frontend always sends the token in header.
  // For simplicity, we'll require token in header.
  if (!token) {
    return res.status(401).json({ error: 'No authorization token' });
  }

  // Verify token using service role
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const userId = user.id;

  // Helper to get or create streak record
  async function getStreakRecord() {
    const { data: row, error } = await supabaseAdmin
      .from('streaks')
      .select('user_id, current_streak:current, longest_streak:longest, last_activity_date:last_active_date, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return row;
  }

  async function getShields() {
    const { data: shieldRow } = await supabaseAdmin
      .from('streak_shields')
      .select('tokens')
      .eq('user_id', userId)
      .maybeSingle();
    return shieldRow?.tokens ?? 0;
  }

  async function updateStreak(updateData: any) {
    const { data, error } = await supabaseAdmin
      .from('streaks')
      .update(updateData)
      .eq('user_id', userId)
      .select('user_id, current_streak:current, longest_streak:longest, last_activity_date:last_active_date, updated_at')
      .single();
    if (error) throw error;
    return data;
  }

  async function upsertShields(tokens: number) {
    const { data, error } = await supabaseAdmin
      .from('streak_shields')
      .upsert({ user_id: userId, tokens }, { onConflict: 'user_id' })
      .select('tokens')
      .single();
    if (error) throw error;
    return data.tokens;
  }

  async function logShieldAction(action: string) {
    await supabaseAdmin
      .from('streak_shield_logs')
      .insert({ user_id: userId, action });
  }

  try {
    let row = await getStreakRecord();
    let shieldTokens = await getShields();

    // If no streak record, create one
    if (!row) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('streaks')
        .insert({ user_id: userId, current: 0, longest: 0, last_active_date: null })
        .select('user_id, current_streak:current, longest_streak:longest, last_activity_date:last_active_date, updated_at')
        .single();

      if (insertError) throw insertError;
      row = inserted;
    }

    const buildResponse = (streakRow: any, shields: number, nextRestart: string | null = null): StreakData => ({
      current_streak: streakRow?.current_streak ?? 0,
      longest_streak: streakRow?.longest_streak ?? streakRow?.current_streak ?? 0,
      last_activity_date: streakRow?.last_activity_date ?? null,
      next_restart_date: nextRestart,
      shields,
    });

    if (req.method === 'GET') {
      return res.status(200).json(buildResponse(row, shieldTokens));
    }

    if (req.method === 'POST') {
      const { action, date } = req.body as { action?: 'use' | 'claim' | 'schedule'; date?: string };

      const now = new Date();
      const today = getDayKey(now);
      const previousCurrent = row.current_streak ?? 0;

      if (action === 'claim') {
        const nextTokens = shieldTokens + 1;
        const updatedTokens = await upsertShields(nextTokens);
        await logShieldAction('claim');
        return res.status(200).json(buildResponse(row, updatedTokens));
      }

      if (action === 'schedule') {
        if (!date) return res.status(400).json({ error: 'Date required for scheduling' });
        return res.status(200).json(buildResponse(row, shieldTokens, date));
      }

      const spentShield = action === 'use';
      if (spentShield && shieldTokens <= 0) {
        return res.status(400).json({ error: 'No shields available' });
      }

      // Skip if already claimed today and not using shield
      if (!spentShield && row.last_activity_date === today) {
        return res.status(200).json(buildResponse(row, shieldTokens));
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

      const updatedRow = await updateStreak({
        current: newCurrent,
        longest: newLongest,
        last_active_date: today,
        updated_at: now.toISOString(),
      });

      let tokensDelta = 0;
      if (spentShield) tokensDelta -= 1;
      if (newCurrent > previousCurrent && newCurrent % 7 === 0) tokensDelta += 1;

      let nextTokens = shieldTokens;
      if (tokensDelta !== 0) {
        nextTokens = Math.max(0, shieldTokens + tokensDelta);
        nextTokens = await upsertShields(nextTokens);
        if (tokensDelta > 0) await logShieldAction('claim');
        if (spentShield) await logShieldAction('use');
      }

      return res.status(200).json(buildResponse(updatedRow, nextTokens));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[API/streak] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}