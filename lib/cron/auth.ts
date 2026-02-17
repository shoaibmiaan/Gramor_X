import crypto from 'crypto';

export function verifyCronSignature(req: { headers: Record<string, string|undefined> }) {
  const sig = req.headers['x-signature'];
  const secret = process.env.WHATSAPP_TASKS_SIGNING_SECRET || '';
  if (!sig || !secret) return false;
  const hmac = crypto.createHmac('sha256', secret).update('ok').digest('hex');
  return sig === hmac;
}
