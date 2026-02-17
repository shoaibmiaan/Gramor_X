import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan } from '@/lib/plan/withPlan';
import type { LiveSessionStatus } from '@/types/supabase';

const CreateSessionBody = z.object({
  type: z.enum(['human', 'ai', 'peer']),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  participantUserId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const SessionQuery = z.object({
  id: z.string().uuid(),
});

type CreateSessionPayload = z.infer<typeof CreateSessionBody>;

type SessionResponse = {
  id: string;
  hostUserId: string;
  participantUserId: string | null;
  type: 'human' | 'ai' | 'peer';
  status: LiveSessionStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  metadata: Record<string, unknown>;
  recordings: Array<{
    id: string;
    storagePath: string;
    transcriptPath: string | null;
    durationSeconds: number | null;
    createdAt: string;
  }>;
  joinToken: string | null;
};

function ensureParticipantAccess(payload: CreateSessionPayload, userId: string, role: string | null) {
  if (!payload.participantUserId) return;
  if (payload.participantUserId === userId) return;

  if (role === 'teacher' || role === 'admin') {
    return;
  }

  throw Object.assign(new Error('Forbidden participant assignment'), { statusCode: 403 });
}

export default withPlan(
  'starter',
  async function handler(req: NextApiRequest, res: NextApiResponse, ctx) {
    if (req.method === 'POST') {
      const parsed = CreateSessionBody.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
      }

      try {
        ensureParticipantAccess(parsed.data, ctx.user.id, ctx.role);
      } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 403;
        return res.status(statusCode).json({ error: 'Forbidden' });
      }

      const scheduledAt = parsed.data.scheduledAt ?? null;
      const sessionStatus: LiveSessionStatus = 'pending';

      const { data, error } = await ctx.supabase
        .from('speaking_sessions')
        .insert({
          host_user_id: ctx.user.id,
          participant_user_id: parsed.data.participantUserId ?? null,
          type: parsed.data.type,
          status: sessionStatus,
          scheduled_at: scheduledAt,
          metadata: parsed.data.metadata ?? {},
        })
        .select('id, status, scheduled_at, metadata')
        .single();

      if (error || !data) {
        return res.status(500).json({ error: 'Failed to create session' });
      }

      return res.status(200).json({
        ok: true,
        sessionId: data.id,
        status: data.status as LiveSessionStatus,
        scheduledAt: data.scheduled_at,
        metadata: data.metadata ?? {},
      });
    }

    if (req.method === 'GET') {
      const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
      const parsedQuery = SessionQuery.safeParse({ id: rawId });
      if (!parsedQuery.success) {
        return res.status(400).json({ error: 'Invalid session id' });
      }

      const { data: session, error: sessionError } = await ctx.supabase
        .from('speaking_sessions')
        .select(
          'id, host_user_id, participant_user_id, type, status, scheduled_at, started_at, ended_at, metadata, created_at, updated_at',
        )
        .eq('id', parsedQuery.data.id)
        .maybeSingle();

      if (sessionError) {
        return res.status(500).json({ error: 'Failed to load session' });
      }

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const viewerId = ctx.user.id;
      const viewerRole = ctx.role;
      const isStaff = viewerRole === 'teacher' || viewerRole === 'admin';
      const isParticipant =
        session.host_user_id === viewerId || (!!session.participant_user_id && session.participant_user_id === viewerId);

      if (!isStaff && !isParticipant) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { data: recordings, error: recordingsError } = await ctx.supabase
        .from('session_recordings')
        .select('id, storage_path, transcript_path, duration_seconds, created_at')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false });

      if (recordingsError) {
        return res.status(500).json({ error: 'Failed to load recordings' });
      }

      const response: SessionResponse = {
        id: session.id,
        hostUserId: session.host_user_id,
        participantUserId: session.participant_user_id ?? null,
        type: session.type as SessionResponse['type'],
        status: session.status as LiveSessionStatus,
        scheduledAt: session.scheduled_at,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        metadata: session.metadata ?? {},
        recordings: (recordings ?? []).map((item) => ({
          id: item.id,
          storagePath: item.storage_path,
          transcriptPath: item.transcript_path ?? null,
          durationSeconds: item.duration_seconds ?? null,
          createdAt: item.created_at,
        })),
        joinToken: null,
      };

      return res.status(200).json(response);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  },
  { allowRoles: ['teacher'] },
);
