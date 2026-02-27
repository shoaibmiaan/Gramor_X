// pages/api/user/dashboard.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type ModuleCard = Readonly<{ id: string; title: string; progress: number }>;
type DashboardPayload = Readonly<{ user: { name: string }; modules: ModuleCard[] }>;

type ErrorPayload = Readonly<{ error: string }>;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } },
);

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardPayload | ErrorPayload>,
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'server_config_error' });
  }

  const token = req.headers.authorization?.split(' ')[1] ?? null;
  if (!token) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  const userId = user.id;

  const [{ data: profile }, listeningCount, readingCount, writingCount, speakingCount] =
    await Promise.all([
      supabaseAdmin.from('profiles').select('full_name').eq('user_id', userId).maybeSingle(),
      supabaseAdmin
        .from('listening_attempts')
        .select('*', { head: true, count: 'exact' })
        .eq('user_id', userId),
      supabaseAdmin
        .from('reading_attempts')
        .select('*', { head: true, count: 'exact' })
        .eq('user_id', userId),
      supabaseAdmin
        .from('writing_attempts')
        .select('*', { head: true, count: 'exact' })
        .eq('user_id', userId),
      supabaseAdmin
        .from('speaking_attempts')
        .select('*', { head: true, count: 'exact' })
        .eq('user_id', userId),
    ]);

  const maxFor100 = 20;
  const toProgress = (count: number | null) => clampProgress(((count ?? 0) / maxFor100) * 100);

  const payload: DashboardPayload = {
    user: { name: profile?.full_name || user.user_metadata?.name || user.email || 'Learner' },
    modules: [
      { id: 'listening', title: 'Listening', progress: toProgress(listeningCount.count) },
      { id: 'reading', title: 'Reading', progress: toProgress(readingCount.count) },
      { id: 'writing', title: 'Writing', progress: toProgress(writingCount.count) },
      { id: 'speaking', title: 'Speaking', progress: toProgress(speakingCount.count) },
    ],
  };

  return res.status(200).json(payload);
}
