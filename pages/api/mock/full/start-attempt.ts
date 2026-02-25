// pages/api/mock/full/start-attempt.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient({ req, res });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { testSlug = 'ielts-full-core' } = req.body ?? {};

    // 1) Create full attempt row
    const { data: attempt, error: insertError } = await supabase
      .from('mock_full_attempts')
      .insert({
        user_id: user.id,
        test_slug: testSlug,
        // optional expires_at: now + 3 hours, etc. handle in DB trigger or here
      })
      .select('*')
      .single();

    if (insertError || !attempt) {
      console.error(insertError);
      return res.status(500).json({ error: 'Failed to create full mock attempt' });
    }

    // OPTIONAL: Here you can also trigger creation of per-module attempts if you want
    // e.g. create listening attempt linked to this full attempt.id

    return res.status(200).json({
      attemptId: attempt.id,
      status: attempt.status,
      expiresAt: attempt.expires_at,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
