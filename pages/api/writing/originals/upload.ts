import fs from 'node:fs/promises';
import path from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';
import type formidable from 'formidable';

import { withPlan } from '@/lib/apiGuard';
import { getClientIp, getRequestId } from '@/lib/api/requestContext';
import { trackor } from '@/lib/analytics/trackor.server';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';
import { mergeIntegrityFlags } from '@/lib/writing/metrics';

export const config = {
  api: {
    bodyParser: false,
  },
};

type Data =
  | {
      text: string;
      legibility: number;
      imagePath: string;
    }
  | { error: string; details?: unknown };

async function parseForm(req: NextApiRequest) {
  const formidableModule = await import('formidable');
  const form = formidableModule.default({ multiples: false, maxFileSize: 15 * 1024 * 1024 });
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);
  const logger = createRequestLogger('api/writing/originals/upload', { requestId, clientIp });

  let parsed;
  try {
    parsed = await parseForm(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse upload';
    logger.error('form parse failed', { error: message });
    return res.status(400).json({ error: message });
  }

  const attemptIdRaw = parsed.fields.attemptId ?? parsed.fields.attempt_id;
  const attemptId = Array.isArray(attemptIdRaw) ? attemptIdRaw[0] : attemptIdRaw;
  if (!attemptId || typeof attemptId !== 'string') {
    return res.status(400).json({ error: 'Missing attemptId' });
  }

  const fileEntry = parsed.files.file ?? parsed.files.image ?? parsed.files.photo;
  const file = Array.isArray(fileEntry) ? fileEntry[0] : fileEntry;
  if (!file || !('filepath' in file)) {
    return res.status(400).json({ error: 'Image file required' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: attemptRow, error: attemptError } = await supabase
    .from('writing_attempts')
    .select('user_id, integrity_flags')
    .eq('id', attemptId)
    .maybeSingle();

  if (attemptError) {
    logger.error('failed to load attempt for upload', { error: attemptError.message, attemptId, userId: user.id });
    return res.status(500).json({ error: attemptError.message });
  }

  if (!attemptRow || attemptRow.user_id !== user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const buffer = await fs.readFile(file.filepath as string);
  const extension = path.extname((file.originalFilename ?? 'upload.jpg').toString()) || '.jpg';
  const objectPath = `${user.id}/${attemptId}/${Date.now()}${extension}`;
  const contentType = (file.mimetype ?? 'image/jpeg').toString();

  const uploadResponse = await supabase.storage
    .from('writing-originals')
    .upload(objectPath, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadResponse.error) {
    logger.error('failed to upload handwriting image', { error: uploadResponse.error.message, attemptId, userId: user.id });
    return res.status(500).json({ error: uploadResponse.error.message });
  }

  const { recognize } = await import('tesseract.js');
  const result = await recognize(buffer, 'eng');
  const text = (result.data?.text ?? '').trim();
  const confidence = Math.round((result.data?.confidence ?? 0) * 100) / 100;
  const legibility = Math.max(0, Math.min(confidence / 100, 1));

  const { error: insertError } = await supabase.from('writing_originals').insert({
    user_id: user.id,
    attempt_id: attemptId,
    image_path: objectPath,
    ocr_text: text,
    legibility,
  });

  if (insertError) {
    logger.error('failed to save handwriting record', { error: insertError.message, attemptId, userId: user.id });
    return res.status(500).json({ error: insertError.message });
  }

  const integrityFlags = mergeIntegrityFlags(attemptRow.integrity_flags, {
    handwriting: { path: objectPath, legibility: Math.round(legibility * 100) / 100 },
  });

  await supabase
    .from('writing_attempts')
    .update({ integrity_flags: integrityFlags })
    .eq('id', attemptId);

  await trackor.log('writing_handwriting_uploaded', {
    attempt_id: attemptId,
    user_id: user.id,
    legibility,
    request_id: requestId,
    ip: clientIp,
  });

  return res.status(200).json({ text, legibility, imagePath: objectPath });
}

export default withPlan('starter', handler, { allowRoles: ['teacher', 'admin'] });
