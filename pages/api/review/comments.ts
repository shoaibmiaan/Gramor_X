import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyReviewShareToken } from '@/lib/review/shareToken';
import { captureException } from '@/lib/monitoring/sentry';

interface ApiComment {
  id: string;
  parentId: string | null;
  authorName: string | null;
  authorRole: string | null;
  body: string;
  createdAt: string;
}

type ResponseBody =
  | { ok: true; data: { comments: ApiComment[]; attemptId: string; expiresAt: string } }
  | { ok: false; error: string };

async function fetchComments(attemptId: string): Promise<ApiComment[]> {
  const { data, error } = await supabaseAdmin
    .from('review_comments')
    .select('id,parent_id,author_name,author_role,body,created_at')
    .eq('attempt_id', attemptId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    parentId: row.parent_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    body: row.body,
    createdAt: row.created_at,
  }));
}

function normalizeName(raw?: unknown) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  return trimmed.slice(0, 80);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  const token =
    req.method === 'GET'
      ? typeof req.query.token === 'string' ? req.query.token : null
      : typeof req.body?.token === 'string' ? req.body.token : null;

  if (!token) {
    return res.status(400).json({ ok: false, error: 'Missing token' });
  }

  let attemptId: string;
  let expiresAt: Date;
  try {
    const payload = verifyReviewShareToken(token);
    attemptId = payload.attemptId;
    expiresAt = payload.expiresAt;
  } catch (error) {
    captureException(error, { route: '/api/review/comments', token: '[redacted]' });
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }

  if (req.method === 'GET') {
    try {
      const comments = await fetchComments(attemptId);
      return res.status(200).json({
        ok: true,
        data: { comments, attemptId, expiresAt: expiresAt.toISOString() },
      });
    } catch (error) {
      captureException(error, { route: '/api/review/comments', method: 'GET', attemptId });
      return res.status(500).json({ ok: false, error: 'Failed to load comments' });
    }
  }

  if (req.method === 'POST') {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
      return res.status(400).json({ ok: false, error: 'Comment cannot be empty' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ ok: false, error: 'Comment is too long' });
    }

    const parentId = typeof req.body?.parentId === 'string' ? req.body.parentId : null;
    const authorName = normalizeName(req.body?.name) ?? null;

    try {
      if (parentId) {
        const { data: parent, error: parentError } = await supabaseAdmin
          .from('review_comments')
          .select('id,attempt_id')
          .eq('id', parentId)
          .maybeSingle();
        if (parentError) throw parentError;
        if (!parent || parent.attempt_id !== attemptId) {
          return res.status(400).json({ ok: false, error: 'Invalid parent comment' });
        }
      }

      const insertResult = await supabaseAdmin.from('review_comments').insert({
        attempt_id: attemptId,
        parent_id: parentId,
        author_name: authorName,
        author_role: 'guest',
        body: message,
      });

      if (insertResult.error) {
        throw insertResult.error;
      }

      const comments = await fetchComments(attemptId);
      return res.status(201).json({
        ok: true,
        data: { comments, attemptId, expiresAt: expiresAt.toISOString() },
      });
    } catch (error) {
      captureException(error, { route: '/api/review/comments', method: 'POST', attemptId });
      return res.status(500).json({ ok: false, error: 'Failed to post comment' });
    }
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
