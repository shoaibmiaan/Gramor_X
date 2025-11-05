export default async function whatsappTasksHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const userId = (req.query.userId as string) || null;
    try {
      const { data, error } = await SUPABASE.from('whatsapp_tasks').select('*').eq('user_id', userId).order('scheduled_at', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data ?? []);
    } catch (e: any) {
      console.error('whatsapp list', e);
      return res.status(500).json({ error: e?.message ?? 'Failed' });
    }
  }

  if (req.method === 'POST') {
    const { userId = null, text = '', scheduled_at = null } = req.body ?? {};
    try {
      const payload = { id: uuidv4(), user_id: userId, text, scheduled_at, delivered: false, created_at: new Date().toISOString() };
      const { error } = await SUPABASE.from('whatsapp_tasks').insert(payload);
      if (error) throw error;
      return res.status(201).json(payload);
    } catch (e: any) {
      console.error('whatsapp create', e);
      return res.status(500).json({ error: e?.message ?? 'Failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
