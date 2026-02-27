import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { MockSection } from '@/lib/mock/state';

type PostBody = {
  attemptId?: string;
  section?: MockSection;
  mockId?: string;
  payload?: Record<string, unknown>;
  elapsed?: number;
  duration?: number;
  completed?: boolean;
};

type PostResponse = { ok: true } | { ok: false; error: string };

type GetResponse =
  | { ok: true; checkpoint: { attemptId: string; section: MockSection; mockId: string; payload: Record<string, unknown>; elapsed: number; duration?: number | null; completed: boolean; updatedAt: string } | null }
  | { ok: false; error: string };

const isSection = (value: unknown): value is MockSection =>
  typeof value === 'string' && ['listening', 'reading', 'writing', 'speaking'].includes(value);

const normalizeElapsed = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
};

const normalizeDuration = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<PostResponse | GetResponse>) {
  if (req.method === 'POST') {
    return postHandler(req, res);
  }
  if (req.method === 'GET') {
    return getHandler(req, res);
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}

async function postHandler(req: NextApiRequest, res: NextApiResponse<PostResponse>) {
  const { attemptId, section, mockId, payload, elapsed, duration, completed = false }: PostBody = req.body || {};

  if (!attemptId || typeof attemptId !== 'string') {
    return res.status(400).json({ ok: false, error: 'attemptId is required' });
  }
  if (!isSection(section)) {
    return res.status(400).json({ ok: false, error: 'section is invalid' });
  }
  if (!mockId || typeof mockId !== 'string') {
    return res.status(400).json({ ok: false, error: 'mockId is required' });
  }

  const supabase = createSupabaseServerClient({ req, res });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const { error } = await supabase
      .from('mock_attempts')
      .upsert(
        {
          user_id: userData.user.id,
          attempt_id: attemptId,
          section,
          mock_id: mockId,
          payload: payload ?? {},
          elapsed_sec: normalizeElapsed(elapsed),
          duration_sec: normalizeDuration(duration),
          completed,
        },
        { onConflict: 'user_id,attempt_id,section' }
      );

    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    const message = err?.message || 'Failed to save checkpoint';
    return res.status(500).json({ ok: false, error: message });
  }
}

async function getHandler(req: NextApiRequest, res: NextApiResponse<GetResponse>) {
  const { attemptId, section, includeCompleted } = req.query as {
    attemptId?: string;
    section?: string;
    includeCompleted?: string;
  };
  if (section && !isSection(section)) {
    return res.status(400).json({ ok: false, error: 'section is invalid' });
  }

  const includeCompletedBool = includeCompleted === 'true';

  const supabase = createSupabaseServerClient({ req, res });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    let query = supabase
      .from('mock_attempts')
      .select('attempt_id, section, mock_id, payload, elapsed_sec, duration_sec, completed, updated_at')
      .eq('user_id', userData.user.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (attemptId) {
      query = query.eq('attempt_id', attemptId);
    }
    if (section) {
      query = query.eq('section', section);
    }
    if (!includeCompletedBool) {
      query = query.eq('completed', false);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(200).json({ ok: true, checkpoint: null });
    }

    const row = data[0];
    return res.status(200).json({
      ok: true,
      checkpoint: {
        attemptId: row.attempt_id as string,
        section: row.section as MockSection,
        mockId: row.mock_id as string,
        payload: (row.payload as Record<string, unknown>) ?? {},
        elapsed: typeof row.elapsed_sec === 'number' ? row.elapsed_sec : 0,
        duration: typeof row.duration_sec === 'number' ? row.duration_sec : null,
        completed: Boolean(row.completed),
        updatedAt: row.updated_at as string,
      },
    });
  } catch (err: any) {
    const message = err?.message || 'Failed to fetch checkpoint';
    return res.status(500).json({ ok: false, error: message });
  }
}
