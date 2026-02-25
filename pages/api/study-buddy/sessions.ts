// pages/api/study-buddy/sessions.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { z } from 'zod';

type StudySessionItem = { skill: string; minutes: number; topic?: string | null; status?: 'pending' | 'started' | 'completed'; note?: string | null };
type StudySessionRecord = {
  id: string;
  user_id: string | null;
  items: StudySessionItem[];
  state: 'pending' | 'started' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  xp_earned: number;
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in environment.');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

function normalizeUserId(raw?: any): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.toLowerCase() === 'null') return null;
  return uuidValidate(trimmed) ? trimmed : null;
}

const Body = z.object({
  userId: z.string().uuid().optional().nullable(),
  items: z.array(
    z.object({
      skill: z.string().min(1).max(64),
      minutes: z.number().int().min(1).max(300),
    })
  ).min(1).max(200),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const parsed = Body.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
  }

  const { items } = parsed.data;
  const user_id = normalizeUserId(parsed.data.userId ?? undefined);

  let supabaseAdmin;
  try {
    supabaseAdmin = getAdminClient();
  } catch (err: any) {
    console.error('[study-sessions] admin client error', err);
    return res.status(500).json({ error: 'supabase_not_configured' });
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  const normalizedItems = items.map((item) => ({
    skill: item.skill,
    minutes: item.minutes,
    topic: null,
    status: 'pending' as const,
    note: null,
  }));

  const totalMinutes = normalizedItems.reduce((sum, item) => sum + item.minutes, 0);

  const payload: StudySessionRecord = {
    id,
    user_id,
    items: normalizedItems,
    state: 'pending',
    created_at: now,
    updated_at: now,
    started_at: null,
    ended_at: null,
    duration_minutes: totalMinutes,
    xp_earned: 0,
  };

  try {
    const { data, error, status, statusText } = await supabaseAdmin
      .from<StudySessionRecord>('study_buddy_sessions')
      .insert(payload)
      .select('*');

    if (error) {
      console.error('[study-sessions] insert error:', { error, status, statusText });
      const message = (error && (error.message || JSON.stringify(error))) ?? 'db_insert_failed';
      return res.status(500).json({ error: message });
    }

    const inserted = Array.isArray(data) && data.length > 0 ? data[0] : payload;
    return res.status(201).json(inserted);
  } catch (err: any) {
    console.error('[study-sessions] unexpected exception', err);
    const info = (err && err.message) ? String(err.message) : 'unknown_error';
    return res.status(500).json({ error: info });
  }
}
