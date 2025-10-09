import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireRole } from '@/lib/requireRole';

interface AudioFile {
  path: string;
  signedUrl: string;
}

interface AttemptDetailResponse {
  ok: true;
  attempt: {
    id: string;
    createdAt: string;
    scenario: string | null;
    bandOverall: number | null;
    bandBreakdown: Record<string, unknown> | null;
    transcript: string | null;
    topic: string | null;
    notes: string | null;
    user: { id: string | null; name: string | null; email: string | null };
    audio: Record<string, AudioFile[]>;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AttemptDetailResponse | { error: string }>,
) {
  try {
    await requireRole(req, ['admin', 'teacher']);
  } catch {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query as { id?: string };
  if (!id) {
    return res.status(400).json({ error: 'Missing attempt id' });
  }

  const { data, error } = await supabaseAdmin
    .from('speaking_attempts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: 'Attempt not found' });
  }

  const userId = data.user_id ? String(data.user_id) : null;

  let profile: { id: string | null; name: string | null; email: string | null } = {
    id: userId,
    name: null,
    email: null,
  };

  if (userId) {
    const { data: prof, error: profError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', userId)
      .maybeSingle();

    if (profError) {
      return res.status(500).json({ error: profError.message });
    }

    if (prof) {
      profile = {
        id: prof.id ? String(prof.id) : userId,
        name: prof.full_name ? String(prof.full_name) : null,
        email: prof.email ? String(prof.email) : null,
      };
    }
  }

  const audio: Record<string, AudioFile[]> = {};
  const rawAudio = (data.audio_urls ?? {}) as Record<string, string[]>;

  for (const [key, list] of Object.entries(rawAudio)) {
    if (!Array.isArray(list) || !list.length) continue;
    const signed: AudioFile[] = [];
    for (const path of list) {
      if (!path) continue;
      try {
        const { data: signedUrlData, error: signedError } = await supabaseAdmin.storage
          .from('speaking-audio')
          .createSignedUrl(path, 300);
        if (signedError || !signedUrlData?.signedUrl) {
          // Skip individual failures but continue processing others.
          // eslint-disable-next-line no-continue
          continue;
        }
        signed.push({ path, signedUrl: signedUrlData.signedUrl });
      } catch {
        // Skip errors for individual files
        // eslint-disable-next-line no-continue
        continue;
      }
    }
    if (signed.length) {
      audio[key] = signed;
    }
  }

  return res.status(200).json({
    ok: true,
    attempt: {
      id: String(data.id),
      createdAt: data.created_at,
      scenario: data.scenario ?? null,
      bandOverall:
        typeof data.band_overall === 'number'
          ? Number(data.band_overall)
          : typeof data.overall_band === 'number'
          ? Number(data.overall_band)
          : null,
      bandBreakdown:
        data.band_breakdown ??
        (data.p1_band || data.p2_band || data.p3_band
          ? {
              fluency: data.p1_band ?? null,
              lexical: data.p2_band ?? null,
              grammar: data.p3_band ?? null,
            }
          : null),
      transcript: data.transcript ?? null,
      topic: data.topic ?? null,
      notes: data.notes ?? data.feedback ?? null,
      user: profile,
      audio,
    },
  });
}
