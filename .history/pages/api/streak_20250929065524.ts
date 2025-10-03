import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type StreakData = {
  current_streak: number;
  last_activity_date: string | null;
  next_restart_date: string | null;
  shields: number;
};

// Utility function (same as client)
const getDayKeyInTZ = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

const daysBetween = (d1: string, d2: string): number => {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No authorization token' });
  }

  // Create admin supabase client to verify user
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Create user-specific supabase client for RLS
  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  await supabaseUser.auth.setSession({ access_token: token, refresh_token: '' });

  try {
    let { data: streak, error: fetchError } = await supabaseUser
      .from('streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (!streak) {
      const defaultStreak: StreakData = {
        current_streak: 0,
        last_activity_date: null,
        next_restart_date: null,
        shields: 0,
      };
      const { data: inserted, error: insertError } = await supabaseUser
        .from('streaks')
        .insert({ ...defaultStreak, user_id: user.id })
        .select()
        .single();

      if (insertError) throw insertError;
      streak = inserted;
    }

    if (req.method === 'GET') {
      return res.status(200).json(streak);
    }

    if (req.method === 'POST') {
      const { action, date } = req.body;
      const today = getDayKeyInTZ();
      let updateData: Partial<StreakData> = {};

      if (!action) {
        const last = streak.last_activity_date;
        if (last === today) {
          return res.status(200).json(streak);
        }

        let newCurrent = 1;
        if (last) {
          const daysSinceLast = daysBetween(last, today);
          if (daysSinceLast === 1) {
            newCurrent = streak.current_streak + 1;
          }
        }
        updateData = {
          current_streak: newCurrent,
          last_activity_date: today,
        };
      } else if (action === 'use') {
        if (streak.shields <= 0) {
          return res.status(400).json({ error: 'No shields available' });
        }

        const last = streak.last_activity_date;
        if (last === today) {
          return res.status(200).json(streak);
        }

        let newCurrent = streak.current_streak + 1;
        if (!last) {
          newCurrent = 1;
        }
        updateData = {
          current_streak: newCurrent,
          last_activity_date: today,
          shields: streak.shields - 1,
        };
      } else if (action === 'claim') {
        updateData = {
          shields: streak.shields + 1,
        };
      } else if (action === 'schedule') {
        if (!date) {
          return res.status(400).json({ error: 'Date required for scheduling' });
        }
        updateData = {
          next_restart_date: date,
        };
      } else {
        return res.status(400).json({ error: 'Invalid action' });
      }

      const { data: updated, error: updateError } = await supabaseUser
        .from('streaks')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.status(200).json(updated);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[API/streak] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}