import type { NextApiRequest, NextApiResponse } from 'next';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_BUCKET = 'avatars';
const UPLOAD_URL_TTL = 60; // seconds

type ResponseBody =
  | {
      uploadUrl: string;
      path: string;
    }
  | { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { fileName, fileType, fileSize, bucket } = req.body as {
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    bucket?: string;
  };

  if (!fileName || typeof fileName !== 'string') {
    return res.status(400).json({ error: 'Missing file name' });
  }
  if (!fileType || typeof fileType !== 'string' || !ALLOWED_MIME_TYPES.has(fileType)) {
    return res.status(400).json({ error: 'Unsupported file type' });
  }
  if (typeof fileSize !== 'number' || Number.isNaN(fileSize) || fileSize <= 0) {
    return res.status(400).json({ error: 'Invalid file size' });
  }
  if (fileSize > MAX_FILE_SIZE) {
    return res.status(400).json({ error: 'File too large' });
  }

  const targetBucket = bucket && bucket.trim() ? bucket.trim() : DEFAULT_BUCKET;
  if (targetBucket !== DEFAULT_BUCKET) {
    return res.status(400).json({ error: 'Invalid bucket' });
  }

  const ext = fileName.split('.').pop()?.toLowerCase();
  const safeExt = ext && /^[a-z0-9]+$/.test(ext) ? ext : 'jpg';
  const path = `${user.id}/avatar-${Date.now()}.${safeExt}`;

  const { data, error } = await supabaseAdmin.storage
    .from(targetBucket)
    .createSignedUploadUrl(path, UPLOAD_URL_TTL);

  if (error || !data?.signedUrl) {
    return res.status(500).json({ error: error?.message || 'Unable to create upload URL' });
  }

  return res.status(200).json({ uploadUrl: data.signedUrl, path });
}
