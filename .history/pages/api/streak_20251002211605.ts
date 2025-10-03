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
    // READ with aliases from 'streaks'
    let { data: row, error: fetchError } = await supabaseUser
      .from('streaks')
      .select('user_id,current_streak:current,last_activity_date:last_active_date')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // Normalize to StreakData shape (fields not present in 'streaks' defaulted)
    let streak: StreakData = {
      current_streak: row?.current_streak ?? 0,
      last_activity_date: row?.last_activity_date ?? null,
      next_restart_date: null,
      shields: 0,
    };

    if (!row) {
      // INSERT with real DB columns on 'streaks'
      const { data: inserted, error: insertError } = await supabaseUser
        .from('streaks')
        .insert({ user_id: user.id, current: 0, last_active_date: null })
        .select('user_id,current_streak:current,last_activity_date:last_active_date')
        .single();

      if (insertError) throw insertError;

      streak = {
        current_streak: inserted.current_streak ?? 0,
        last_activity_date: inserted.last_activity_date ?? null,
        next_restart_date: null,
        shields: 0,
      };
      row = inserted;
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

      // Map to real DB columns (only those that exist on 'streaks')
      const updateDb: Record<string, unknown> = {};
      if (typeof updateData.current_streak === 'number') {
        updateDb.current = updateData.current_streak;
      }
      if (typeof updateData.last_activity_date === 'string') {
        updateDb.last_active_date = updateData.last_activity_date;
      }

      const { data: updatedRow, error: updateError } = await supabaseUser
        .from('streaks')
        .update(updateDb)
        .eq('user_id', user.id)
        .select('user_id,current_streak:current,last_activity_date:last_active_date')
        .single();

      if (updateError) throw updateError;

      const updated: StreakData = {
        current_streak: updatedRow.current_streak ?? streak.current_streak,
        last_activity_date: updatedRow.last_activity_date ?? streak.last_activity_date,
        // These fields are not stored on 'streaks'; keep request-intended values or prior defaults
        next_restart_date: updateData.next_restart_date ?? streak.next_restart_date ?? null,
        shields: typeof updateData.shields === 'number' ? updateData.shields : streak.shields ?? 0,
      };

      return res.status(200).json(updated);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[API/streak] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
