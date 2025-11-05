import Twilio from 'twilio';

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const WHATSAPP_FROM = process.env.WHATSAPP_FROM; // e.g. 'whatsapp:+1415...'

export default async function whatsappSendHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.body ?? {};
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    const { data: task, error } = await SUPABASE.from('whatsapp_tasks').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // If Twilio configured, attempt send
    if (TWILIO_SID && TWILIO_TOKEN && WHATSAPP_FROM) {
      const client = Twilio(TWILIO_SID, TWILIO_TOKEN);
      // User phone must exist in users/profile table — here we fetch profile phone
      const { data: profile } = await SUPABASE.from('profiles').select('phone, id').eq('user_id', task.user_id).maybeSingle();
      const to = profile?.phone;
      if (!to) return res.status(400).json({ error: 'Recipient phone not configured' });

      const message = await client.messages.create({ from: WHATSAPP_FROM, to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`, body: task.text });
      // mark delivered
      await SUPABASE.from('whatsapp_tasks').update({ delivered: true, delivered_at: new Date().toISOString() }).eq('id', id);
      return res.status(200).json({ success: true, sid: message.sid });
    }

    // No provider configured — just mark as not sent but accept
    await SUPABASE.from('whatsapp_tasks').update({ delivered: false }).eq('id', id);
    return res.status(200).json({ success: true, note: 'No provider configured; task recorded.' });
  } catch (e: any) {
    console.error('whatsapp send', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
