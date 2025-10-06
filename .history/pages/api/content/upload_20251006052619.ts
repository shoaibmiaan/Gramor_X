import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/apiGuard';

const BodySchema = z.object({
  filePath: z.string().max(256), // Path in bucket, e.g., 'users/123/file.pdf'
  contentType: z.string().max(64), // e.g., 'application/pdf'
  metadata: z.record(z.string(), z.any()).optional(),
});

type UploadResponse =
  | { ok: true; contentId: string; filePath: string }
  | { ok: false; error: string; code?: 'UNAUTHORIZED' | 'BAD_REQUEST' | 'DB_ERROR' };

const BUCKET = 'content';

async function handler(req: NextApiRequest, res: NextApiResponse<UploadResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // ❗️ Fixed: only pass req so cookies are actually read
  const supabase = supabaseServer(req);

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.message, code: 'BAD_REQUEST' });
  const { filePath, contentType, metadata } = parsed.data;

  // Insert DB row
  const { data: created, error: cErr } = await supabase
    .from('content_items')
    .insert({
      owner_id: user.id,
      file_path: filePath,
      content_type: contentType,
      status: 'draft',
      metadata_json: metadata ?? null,
    })
    .select('id')
    .single();

  if (cErr) return res.status(500).json({ ok: false, error: cErr.message, code: 'DB_ERROR' });

  // Note: assumes file is already uploaded to bucket (e.g., via client-side signed URL)
  return res.status(200).json({ ok: true, contentId: created!.id as string, filePath });
}

export default withPlan('booster', handler);
