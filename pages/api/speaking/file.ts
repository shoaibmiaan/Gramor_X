// pages/api/speaking/file.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { AppRole } from '@/lib/requireRole';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: 'Missing path' });

  const supabase = createSupabaseServerClient({ req });

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Path format: userId/attemptId/context/timestamp.ext
    const parts = filePath.split('/');
    if (parts.length < 2) return res.status(400).json({ error: 'Invalid path format' });
    const [ownerId, attemptId] = parts;

    const metaRole =
      (user.app_metadata?.role as AppRole | undefined) ||
      (user.user_metadata?.role as AppRole | undefined) ||
      null;

    let role = metaRole ?? null;
    if (!role) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      role = (profile?.role as AppRole | undefined) ?? null;
    }

    const isOwner = ownerId === user.id;
    const isStaff = role === 'teacher' || role === 'admin';
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Verify attempt belongs to user
    const { data: attempt, error } = await supabaseAdmin
      .from('speaking_attempts')
      .select('id,user_id')
      .eq('id', attemptId)
      .single();

    if (error || !attempt || attempt.user_id !== ownerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Sign the URL
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from('speaking-audio')
      .createSignedUrl(filePath, 60); // 60 sec

    if (signErr || !signed?.signedUrl) {
      throw new Error(signErr?.message || 'Unable to sign URL');
    }

    return res.redirect(signed.signedUrl);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
