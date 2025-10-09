// pages/api/speaking/attempts/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { resolveUserRole, isStaffRole } from '@/lib/serverRole';

type Breakdown = {
  fluency?: number | null;
  lexical?: number | null;
  grammar?: number | null;
  pronunciation?: number | null;
};

type AttemptResponse = {
  ok: true;
  attempt: {
    id: string;
    section: string | null;
    createdAt: string | null;
    durationSec: number | null;
    topic: string | null;
    points: string[] | null;
    transcript: string | null;
    feedback: string | null;
    overall: number | null;
    breakdown: Breakdown | null;
    audioPaths: string[];
  };
};

type ErrorResponse = { ok: false; error: string };

function normalizeAudioPaths(input: any): string[] {
  const paths = new Set<string>();
  if (typeof input === 'string' && input.trim()) {
    paths.add(input.trim());
  } else if (Array.isArray(input)) {
    for (const value of input) {
      if (typeof value === 'string' && value.trim()) {
        paths.add(value.trim());
      } else {
        normalizeAudioPaths(value).forEach((item) => paths.add(item));
      }
    }
  } else if (input && typeof input === 'object') {
    for (const value of Object.values(input)) {
      normalizeAudioPaths(value).forEach((item) => paths.add(item));
    }
  }
  return Array.from(paths);
}

function cleanBreakdown(data: Breakdown | null | undefined): Breakdown | null {
  if (!data) return null;
  const entries = Object.entries(data).filter(([, value]) => typeof value === 'number');
  if (entries.length === 0) return null;
  return Object.fromEntries(entries) as Breakdown;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AttemptResponse | ErrorResponse>,
) {
  const { id } = req.query;
  const attemptId = Array.isArray(id) ? id[0] : id;

  if (!attemptId) {
    return res.status(400).json({ ok: false, error: 'Missing attempt id' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const supabase = createSupabaseServerClient({ req });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const { data, error } = await supabaseAdmin
    .from('speaking_attempts')
    .select(
      [
        'id',
        'user_id',
        'section',
        'created_at',
        'duration_sec',
        'topic',
        'points',
        'transcript',
        'feedback',
        'overall',
        'fluency',
        'lexical',
        'grammar',
        'pronunciation',
        'band_overall',
        'band_breakdown',
        'band_notes',
        'file_url',
        'audio_urls',
      ].join(','),
    )
    .eq('id', attemptId)
    .single();

  if (error || !data) {
    return res.status(404).json({ ok: false, error: 'Attempt not found' });
  }

  const role = await resolveUserRole(user);
  const canReview = data.user_id === user.id || isStaffRole(role);

  if (!canReview) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  const rawBreakdown: Breakdown | null =
    (data.band_breakdown as Breakdown | null | undefined) ??
    ({
      fluency: data.fluency,
      lexical: data.lexical,
      grammar: data.grammar,
      pronunciation: data.pronunciation,
    } as Breakdown);

  const breakdown = cleanBreakdown(rawBreakdown);
  const overall =
    typeof data.band_overall === 'number'
      ? data.band_overall
      : typeof data.overall === 'number'
      ? data.overall
      : null;

  const feedback =
    typeof data.band_notes === 'string' && data.band_notes.trim()
      ? data.band_notes.trim()
      : typeof data.feedback === 'string' && data.feedback.trim()
      ? data.feedback.trim()
      : null;

  const audioPaths = normalizeAudioPaths([data.file_url, data.audio_urls]);

  const rawPoints = Array.isArray(data.points) ? data.points : null;
  const points = rawPoints
    ? rawPoints
        .map((value: unknown) => (typeof value === 'string' ? value : value != null ? String(value) : ''))
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : null;

  return res.status(200).json({
    ok: true,
    attempt: {
      id: data.id,
      section: data.section ?? null,
      createdAt: data.created_at ?? null,
      durationSec: data.duration_sec ?? null,
      topic: data.topic ?? null,
      points,
      transcript: data.transcript ?? null,
      feedback,
      overall,
      breakdown,
      audioPaths,
    },
  });
}
