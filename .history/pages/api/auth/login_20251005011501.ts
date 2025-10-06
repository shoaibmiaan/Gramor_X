// pages/api/auth/login.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { redis } from '@/lib/redis';
import { evaluateRisk, riskThreshold } from '@/lib/risk';
import { incrementFlaggedLogin } from '@/lib/metrics';

const MAX_ATTEMPTS = 5;
const BLOCK_TIME_SEC = 60 * 15; // 15 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const ipRaw = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ip = Array.isArray(ipRaw) ? ipRaw[0] : String(ipRaw).split(',')[0] || '';
  const userAgent = req.headers['user-agent'] || '';

  // Basic risk gate (your existing logic)
  const risk = await evaluateRisk({ ip, userAgent, email });
  if (risk.score >= riskThreshold) {
    console.warn('Login attempt flagged', { ip, userAgent, email, score: risk.score });
    incrementFlaggedLogin();
    return res.status(403).json({ error: 'Login blocked due to suspicious activity.' });
  }

  // Rate limit on failed attempts by IP
  const key = `login:fail:${ip}`;
  const attemptsStr = await redis.get(key);
  const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
  if (attempts >= MAX_ATTEMPTS) {
    return res
      .status(429)
      .json({ error: 'Too many failed login attempts. Please try again later.' });
  }

  // Authenticate with service role
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    await redis.incr(key);
    await redis.expire(key, BLOCK_TIME_SEC);
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // ✅ WRITE SUPABASE AUTH COOKIES ON THIS RESPONSE
  const supabase = createPagesServerClient({ req, res });
  await supabase.auth.setSession(data.session);

  // Clear failure counter
  await redis.del(key);

  // Don’t return the session payload; cookies are set.
  return res.status(200).json({ ok: true });
}
