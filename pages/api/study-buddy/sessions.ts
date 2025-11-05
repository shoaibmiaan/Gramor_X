// pages/api/study-buddy/sessions.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

type StudySessionItem = { skill: string; minutes: number };
type StudySessionRecord = {
  id: string;
  user_id: string | null;
  items: StudySessionItem[];
  state: 'pending' | 'started' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
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
  // Accept explicit "null" string
  if (trimmed.toLowerCase() === 'null') return null;
  // If valid UUID, return it, otherwise null
  return uuidValidate(trimmed) ? trimmed : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const body = req.body ?? {};
  const items = Array.isArray(body.items) ? body.items : [];

  if (!items.length) {
    return res.status(400).json({ error: 'items_required' });
  }
  if (items.length > 200) {
    return res.status(400).json({ error: 'too_many_items' });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = getAdminClient();
  } catch (err: any) {
    console.error('[study-sessions] admin client error', err);
    return res.status(500).json({ error: 'supabase_not_configured' });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const user_id = normalizeUserId(body.userId);

  const payload = {
    id,
    user_id,
    items,
    state: 'pending' as const,
    created_at: now,
    updated_at: now,
  };

  try {
    const { data, error, status, statusText } = await supabaseAdmin
      .from<StudySessionRecord>('study_sessions')
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
