import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan } from '@/lib/apiGuard';
import { getServerClient } from '@/lib/supabaseServer';
import { trackor } from '@/lib/analytics/trackor.server';

const MAX_NOTE_LENGTH = 2000;
const DEFAULT_COLOR = 'warning';

const rangeSchema = z
  .object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
    color: z.string().min(1).max(32).optional(),
  })
  .refine((value) => value.end > value.start, {
    message: 'Range end must be greater than start',
    path: ['end'],
  });

const createSchema = z.object({
  attemptId: z.string().min(1),
  passageId: z.string().min(1),
  ranges: z.array(rangeSchema).min(1),
  noteText: z
    .string()
    .max(MAX_NOTE_LENGTH)
    .optional()
    .nullable(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  noteText: z
    .string()
    .max(MAX_NOTE_LENGTH)
    .optional()
    .nullable(),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

type ReadingNoteRow = {
  id: string;
  attempt_id: string;
  passage_id: string;
  ranges: Array<{ start?: number; end?: number; color?: string }> | null;
  note_text: string | null;
  created_at: string;
  updated_at: string | null;
};

type ReadingNoteResponse = {
  id: string;
  attemptId: string;
  passageId: string;
  ranges: Array<{ start: number; end: number; color: string }>;
  noteText: string | null;
  createdAt: string;
  updatedAt: string | null;
};

type GetResponse = { ok: true; notes: ReadingNoteResponse[] } | { ok: false; error: string };
type MutationResponse =
  | { ok: true; note: ReadingNoteResponse }
  | { ok: true; deleted: true }
  | { ok: false; error: string };

async function handler(req: NextApiRequest, res: NextApiResponse<GetResponse | MutationResponse>) {
  if (req.method === 'GET') {
    return getHandler(req, res);
  }
  if (req.method === 'POST') {
    return postHandler(req, res);
  }
  if (req.method === 'PATCH') {
    return patchHandler(req, res);
  }
  if (req.method === 'DELETE') {
    return deleteHandler(req, res);
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}

async function getHandler(req: NextApiRequest, res: NextApiResponse<GetResponse>) {
  const attemptId = typeof req.query.attemptId === 'string' ? req.query.attemptId : null;
  const passageId = typeof req.query.passageId === 'string' ? req.query.passageId : null;
  if (!attemptId) {
    return res.status(400).json({ ok: false, error: 'attemptId is required' });
  }

  const supabase = getServerClient(req, res);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    let query = supabase
      .from('reading_notes')
      .select('id, attempt_id, passage_id, ranges, note_text, created_at, updated_at')
      .eq('user_id', userData.user.id)
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: true });

    if (passageId) {
      query = query.eq('passage_id', passageId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const notes = (data ?? []).map(mapRow);
    return res.status(200).json({ ok: true, notes });
  } catch (error: any) {
    const message = error?.message || 'Failed to load notes';
    return res.status(500).json({ ok: false, error: message });
  }
}

async function postHandler(req: NextApiRequest, res: NextApiResponse<MutationResponse>) {
  const parsed = createSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid payload' });
  }

  const supabase = getServerClient(req, res);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const ranges = parsed.data.ranges.map((range) => {
    const start = Math.max(0, Math.round(range.start));
    const end = Math.max(start + 1, Math.round(range.end));
    return {
      start,
      end,
      color: range.color ?? DEFAULT_COLOR,
    };
  });

  try {
    const { data, error } = await supabase
      .from('reading_notes')
      .insert({
        user_id: userData.user.id,
        attempt_id: parsed.data.attemptId,
        passage_id: parsed.data.passageId,
        ranges,
        note_text: parsed.data.noteText ?? null,
      })
      .select('id, attempt_id, passage_id, ranges, note_text, created_at, updated_at')
      .single<ReadingNoteRow>();

    if (error) throw error;
    const note = mapRow(data);

    await trackor.log('reading.highlight.add', {
      attemptId: parsed.data.attemptId,
      passageId: parsed.data.passageId,
      withNote: Boolean(parsed.data.noteText && parsed.data.noteText.trim().length > 0),
    });
    if (parsed.data.noteText && parsed.data.noteText.trim().length > 0) {
      await trackor.log('reading.note.add', {
        attemptId: parsed.data.attemptId,
        passageId: parsed.data.passageId,
        characters: parsed.data.noteText.length,
      });
    }

    return res.status(201).json({ ok: true, note });
  } catch (error: any) {
    const message = error?.message || 'Failed to save note';
    return res.status(500).json({ ok: false, error: message });
  }
}

async function patchHandler(req: NextApiRequest, res: NextApiResponse<MutationResponse>) {
  const parsed = updateSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid payload' });
  }

  const supabase = getServerClient(req, res);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const { data, error } = await supabase
      .from('reading_notes')
      .update({ note_text: parsed.data.noteText ?? null })
      .eq('user_id', userData.user.id)
      .eq('id', parsed.data.id)
      .select('id, attempt_id, passage_id, ranges, note_text, created_at, updated_at')
      .single<ReadingNoteRow>();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ ok: false, error: 'Note not found' });
    }

    return res.status(200).json({ ok: true, note: mapRow(data) });
  } catch (error: any) {
    const message = error?.message || 'Failed to update note';
    return res.status(500).json({ ok: false, error: message });
  }
}

async function deleteHandler(req: NextApiRequest, res: NextApiResponse<MutationResponse>) {
  const parsed = deleteSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid payload' });
  }

  const supabase = getServerClient(req, res);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const { error } = await supabase
      .from('reading_notes')
      .delete()
      .eq('user_id', userData.user.id)
      .eq('id', parsed.data.id);

    if (error) throw error;

    return res.status(200).json({ ok: true, deleted: true });
  } catch (error: any) {
    const message = error?.message || 'Failed to delete note';
    return res.status(500).json({ ok: false, error: message });
  }
}

function mapRow(row: ReadingNoteRow): ReadingNoteResponse {
  const ranges = Array.isArray(row.ranges)
    ? row.ranges
        .map((range) => ({
          start: typeof range?.start === 'number' ? Math.max(0, Math.round(range.start)) : 0,
          end: typeof range?.end === 'number' ? Math.max(0, Math.round(range.end)) : 0,
          color: typeof range?.color === 'string' && range.color ? range.color : DEFAULT_COLOR,
        }))
        .filter((range) => range.end > range.start)
    : [];

  return {
    id: row.id,
    attemptId: row.attempt_id,
    passageId: row.passage_id,
    ranges,
    noteText: row.note_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default withPlan('starter', handler);
