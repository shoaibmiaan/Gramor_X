import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

const ParamsSchema = z.object({
  id: z.union([z.string(), z.array(z.string())]).transform((value) => (Array.isArray(value) ? value[0] : value)).pipe(z.string().min(1)),
});

const DeleteResponseSchema = z.object({ ok: z.literal(true) });

type DeleteResponse = z.infer<typeof DeleteResponseSchema> | { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<DeleteResponse>) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = createSupabaseServerClient({ req });
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = ParamsSchema.safeParse(req.query);
  if (!parsed.success || !parsed.data.id) {
    return res.status(400).json({ error: 'Invalid saved item id' });
  }

  const { id } = parsed.data;

  const { data, error } = await supabase
    .from('user_bookmarks')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Not found' });
    }
    if (error.code === '42501' || error.message?.toLowerCase().includes('row-level security')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: 'Not found' });
  }

  const response = DeleteResponseSchema.parse({ ok: true });
  return res.status(200).json(response);
}
