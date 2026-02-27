import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';

import { readingBandFromRaw } from '@/lib/reading/band';
import { supabaseServer, supabaseService } from '@/lib/supabaseServer';
import { syncStreak } from '@/lib/streaks';
import { trackor } from '@/lib/analytics/trackor.server';
import {
  computeReadingMockXp,
  resolveTargetBand,
  sumReadingMockXp,
  xpProgressPercent,
  xpRequiredForBand,
} from '@/lib/mock/xp';
import type { MockReadingResultResponse } from '@/types/api/mock';

interface PostBody {
  attemptId?: string;
  paperId?: string;
  correct?: number;
  total?: number;
  durationSec?: number;
  tabSwitches?: number;
  answers?: Record<string, string>;
}

const DEFAULT_TIMEZONE = 'Asia/Karachi';

function toInt(value: unknown, fallback = 0): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.round(num);
}

function parseScore(row: any) {
  const payload = row?.score_json && typeof row.score_json === 'object' ? row.score_json : row ?? {};
  const answers = (payload?.answers && typeof payload.answers === 'object')
    ? payload.answers
    : (row?.answers && typeof row.answers === 'object')
    ? row.answers
    : {};
  const correct = Number(payload?.correct ?? payload?.score ?? row?.score ?? 0);
  const total = Number(payload?.total ?? payload?.questions ?? row?.total ?? 0);
  const durationSec = Number(
    payload?.durationSec ?? payload?.duration_sec ?? payload?.duration ?? row?.duration_sec ?? 0,
  );
  const band = typeof payload?.band === 'number'
    ? payload.band
    : Number(payload?.score_band ?? row?.band ?? row?.score_band ?? 0);
  return {
    band,
    correct,
    total,
    durationSec,
    answers: answers as Record<string, string>,
  };
}

async function loadAttemptSummary(userId: string, attemptId: string) {
  const svc = supabaseService();
  const { data, error } = await svc
    .from('attempts_reading')
    .select('id, paper_id, submitted_at, score_json')
    .eq('user_id', userId)
    .eq('id', attemptId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const parsed = parseScore(data);
  const total = Math.max(1, parsed.total || 0);
  const correct = Math.max(0, Math.min(parsed.correct || 0, total));
  const band = parsed.band || readingBandFromRaw(correct, total);
  const percentage = Math.round((correct / total) * 100);
  const durationSec = Math.max(0, toInt(parsed.durationSec, 0));

  return {
    id: data.id as string,
    paperId: data.paper_id as string,
    submittedAt: (data.submitted_at as string) ?? null,
    answers: parsed.answers,
    correct,
    total,
    percentage,
    band,
    durationSec,
  };
}

async function aggregateXp(userId: string) {
  const svc = supabaseService();
  const { data, error } = await svc
    .from('attempts_reading')
    .select('score_json')
    .eq('user_id', userId);

  if (error) throw error;

  const attempts = (data ?? []).map((row: any) => {
    const parsed = parseScore(row);
    return {
      correct: parsed.correct,
      total: parsed.total,
      durationSec: parsed.durationSec,
    };
  });

  return sumReadingMockXp(attempts);
}

async function loadCurrentStreak(userId: string): Promise<number> {
  const svc = supabaseService();
  const { data, error } = await svc
    .from('user_streaks')
    .select('current_streak')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  const value = Number(data?.current_streak ?? 0);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MockReadingResultResponse>,
) {
  const client = supabaseServer(req, res);
  const { data: auth } = await client.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    if (req.method === 'POST') {
      const body = (req.body ?? {}) as PostBody;
      const paperId = typeof body.paperId === 'string' ? body.paperId.trim() : '';
      if (!paperId) {
        return res.status(400).json({ ok: false, error: 'paperId is required' });
      }

      const total = Math.max(1, toInt(body.total, 0));
      const correct = Math.max(0, Math.min(toInt(body.correct, 0), total));
      const durationSec = Math.max(0, toInt(body.durationSec, 0));
      const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
      const band = readingBandFromRaw(correct, total);
      const attemptId = body.attemptId && typeof body.attemptId === 'string' && body.attemptId.trim()
        ? body.attemptId
        : randomUUID();

      const svc = supabaseService();
      const { error: upsertError } = await svc
        .from('attempts_reading')
        .upsert(
          {
            id: attemptId,
            user_id: user.id,
            paper_id: paperId,
            submitted_at: new Date().toISOString(),
            score_json: {
              answers,
              correct,
              total,
              percentage: Math.round((correct / total) * 100),
              duration_sec: durationSec,
              durationSec,
              band,
            },
          },
          { onConflict: 'id' },
        );

      if (upsertError) {
        throw upsertError;
      }

      let profileTimezone = DEFAULT_TIMEZONE;
      let goalBand: number | null = null;
      try {
        const { data: profile } = await svc
          .from('profiles')
          .select('timezone, goal_band')
          .eq('id', user.id)
          .maybeSingle();
        profileTimezone = (profile?.timezone as string) || DEFAULT_TIMEZONE;
        goalBand = typeof profile?.goal_band === 'number' ? profile.goal_band : null;
      } catch (err) {
        console.warn('[mock/reading/result] profile lookup failed', err);
      }

      const totalXp = await aggregateXp(user.id);
      const { xp: awarded } = computeReadingMockXp(correct, total, durationSec);
      const targetBand = resolveTargetBand(band, goalBand ?? undefined);
      const requiredXp = xpRequiredForBand(targetBand);
      const percent = xpProgressPercent(totalXp, requiredXp);

      let streak = 0;
      try {
        streak = await syncStreak(svc, user.id, profileTimezone);
      } catch (err) {
        console.warn('[mock/reading/result] streak sync failed', err);
      }

      try {
        await trackor.log('xp.awarded.mock.reading', {
          user_id: user.id,
          attempt_id: attemptId,
          paper_id: paperId,
          band,
          correct,
          total,
          duration_sec: durationSec,
          xp_awarded: awarded,
          xp_total: totalXp,
          target_band: targetBand,
        });
      } catch (err) {
        console.warn('[mock/reading/result] analytics failed', err);
      }

      const attempt = await loadAttemptSummary(user.id, attemptId);
      if (!attempt) {
        return res.status(200).json({
          ok: true,
          attempt: {
            id: attemptId,
            paperId,
            band,
            correct,
            total,
            percentage: Math.round((correct / total) * 100),
            durationSec,
            submittedAt: new Date().toISOString(),
            answers,
          },
          xp: {
            awarded,
            total: totalXp,
            required: requiredXp,
            percent,
            targetBand,
          },
          streak: { current: streak },
        });
      }

      return res.status(200).json({
        ok: true,
        attempt,
        xp: {
          awarded,
          total: totalXp,
          required: requiredXp,
          percent,
          targetBand,
        },
        streak: { current: streak },
      });
    }

    if (req.method === 'GET') {
      const attemptId = typeof req.query.attemptId === 'string' ? req.query.attemptId : '';
      if (!attemptId) {
        return res.status(400).json({ ok: false, error: 'attemptId is required' });
      }

      const attempt = await loadAttemptSummary(user.id, attemptId);
      if (!attempt) {
        return res.status(404).json({ ok: false, error: 'Attempt not found' });
      }

      let goalBand: number | null = null;
      try {
        const { data: profile } = await supabaseService()
          .from('profiles')
          .select('goal_band')
          .eq('id', user.id)
          .maybeSingle();
        goalBand = typeof profile?.goal_band === 'number' ? profile.goal_band : null;
      } catch (err) {
        console.warn('[mock/reading/result] profile goal lookup failed', err);
      }

      const totalXp = await aggregateXp(user.id);
      const { xp: awarded } = computeReadingMockXp(attempt.correct, attempt.total, attempt.durationSec);
      const targetBand = resolveTargetBand(attempt.band, goalBand ?? undefined);
      const requiredXp = xpRequiredForBand(targetBand);
      const percent = xpProgressPercent(totalXp, requiredXp);

      let currentStreak = 0;
      try {
        currentStreak = await loadCurrentStreak(user.id);
      } catch (err) {
        console.warn('[mock/reading/result] streak fetch failed', err);
      }

      return res.status(200).json({
        ok: true,
        attempt,
        xp: {
          awarded,
          total: totalXp,
          required: requiredXp,
          percent,
          targetBand,
        },
        streak: { current: currentStreak },
      });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[mock/reading/result] failed', error);
    return res.status(500).json({ ok: false, error: error?.message ?? 'Unexpected error' });
  }
}
