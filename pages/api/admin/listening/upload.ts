import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { type File } from 'formidable';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { extractRole } from '@/lib/roles';

export const config = { api: { bodyParser: false, sizeLimit: '40mb' } };

const BUCKET = 'listening-tracks';
const MAX_BYTES = 40 * 1024 * 1024;
const ALLOWED_MIMES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/webm',
]);

function getSingleField(fields: formidable.Fields, key: string): string | undefined {
  const value = fields[key];
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' ? value : undefined;
}

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'listening-track';
}

function parseForm(req: NextApiRequest) {
  const form = formidable({ multiples: false, maxFileSize: MAX_BYTES });
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  const role = extractRole(user);
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { fields, files } = await parseForm(req);
    const file = (files.file as File) ?? null;
    if (!file?.filepath) {
      return res.status(400).json({ error: 'Missing file' });
    }

    const buf = await fs.readFile(file.filepath);
    if (buf.byteLength > MAX_BYTES) {
      return res.status(400).json({ error: 'File too large (max 40MB)' });
    }

    const detected = await fileTypeFromBuffer(buf);
    if (!detected || !ALLOWED_MIMES.has(detected.mime)) {
      return res.status(400).json({ error: 'Unsupported audio type' });
    }

    const hint = getSingleField(fields, 'slug') || getSingleField(fields, 'title') || 'track';
    const folder = slugify(hint);
    const ext = detected.ext === 'mp4' ? 'm4a' : detected.ext;
    const filename = `${Date.now()}.${ext}`;
    const storagePath = path.posix.join('tracks', folder, filename);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buf, { contentType: detected.mime, upsert: true });

    if (uploadError) {
      return res.status(500).json({ error: uploadError.message || 'Upload failed' });
    }

    const { data: publicData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = publicData?.publicUrl ?? null;

    await fs.unlink(file.filepath).catch(() => {});

    return res.status(200).json({
      ok: true,
      path: storagePath,
      mime: detected.mime,
      publicUrl,
    });
  } catch (error: any) {
    console.error('[admin/listening/upload]', error);
    return res.status(500).json({ error: error?.message || 'Upload failed' });
  }
}
