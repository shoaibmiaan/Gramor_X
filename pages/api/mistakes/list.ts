export default async function mistakesListHandler(req: NextApiRequest, res: NextApiResponse) {
  const userId = (req.query.userId as string) || null;
  try {
    const { data, error } = await SUPABASE.from('mistakes_book').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return res.status(200).json(data ?? []);
  } catch (e: any) {
    console.error('mistakes list', e);
    return res.status(500).json({ error: e?.message ?? 'Failed to load' });
  }
}
