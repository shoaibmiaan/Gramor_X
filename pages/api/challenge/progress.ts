// pages/api/challenge/progress.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { updateChallengeProgress } from "@/lib/challenge";
import { ChallengeProgressUpdateRequest, ChallengeProgressResponse } from "@/types/challenge";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { supabaseService } from '@/lib/supabaseServer';
import { logXpEvent } from '@/lib/xp';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChallengeProgressResponse>
) {
  if (req.method !== "POST") return res.status(405).end();

  const payload = req.body as ChallengeProgressUpdateRequest;

  const {
    data: { user },
  } = await supabaseBrowser.auth.getUser();

  if (!user) return res.status(401).json({ ok: false, error: "Unauthorized" });

  let previousStatus: string | null = null;
  try {
    const svc = supabaseService();
    const { data: enrollmentRow } = await svc
      .from('challenge_enrollments')
      .select('progress')
      .eq('id', payload.enrollmentId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (enrollmentRow && typeof enrollmentRow.progress === 'object') {
      previousStatus = (enrollmentRow.progress as Record<string, string | null | undefined>)[`day${payload.day}`] ?? null;
    }
  } catch (err) {
    console.error('[api/challenge/progress] failed to load previous status', err);
  }

  const result = await updateChallengeProgress(user.id, payload);
  if (result.ok && payload.status === 'done' && previousStatus !== 'done') {
    try {
      await logXpEvent(user.id, 'correct', {
        enrollmentId: payload.enrollmentId,
        day: payload.day,
      });
    } catch (err) {
      console.error('[api/challenge/progress] failed to log xp', err);
    }
  }

  res.status(result.ok ? 200 : 400).json(result);
}
