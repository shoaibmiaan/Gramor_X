export default async function mistakesCategorizeHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id, action } = req.body ?? {};
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    if (action === 'toggle_resolved') {
      // fetch current
      const { data, error } = await SUPABASE.from('mistakes_book').select('resolved').eq('id', id).maybeSingle();
      if (error) throw error;
      const cur = data?.resolved ?? false;
      const { error: up } = await SUPABASE.from('mistakes_book').update({ resolved: !cur }).eq('id', id);
      if (up) throw up;
      return res.status(200).json({ success: true });
    }

    // Other categories / tags could be supported here
    return res.status(400).json({ error: 'Unknown action' });
  } catch (e: any) {
    console.error('mistakes categorize', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
