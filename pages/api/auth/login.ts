import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/auth/server';
import { redis } from '@/lib/redis';
import { evaluateRisk, riskThreshold } from '@/lib/risk';
import { incrementFlaggedLogin } from '@/lib/metrics';
import { enforceSameOrigin } from '@/lib/security/csrf';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabaseService } from '@/lib/supabaseServer';

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_SEC = 60 * 10; // 10 minutes
const BLOCK_TIME_SEC = 60 * 30; // 30 minutes

type LoginAuditEvent = {
  email: string;
  ip: string;
  userAgent: string;
  outcome: 'success' | 'failed' | 'blocked';
  reason: string;
  userId?: string | null;
};

function resolveAdminClient(candidate: any) {
  if (!candidate) return null;
  if (typeof candidate.from === 'function') return candidate;
  if (candidate.admin && typeof candidate.admin.from === 'function') return candidate.admin;
  if (candidate.supabaseAdmin && typeof candidate.supabaseAdmin.from === 'function') return candidate.supabaseAdmin;
  if (candidate.default && typeof candidate.default.from === 'function') return candidate.default;
  return null;
}

function sanitizeEmail(value: string) {
  return value.trim().toLowerCase();
}

async function recordLoginAudit(event: LoginAuditEvent) {
  try {
    const adminClient = resolveAdminClient(supabaseService()) ?? resolveAdminClient(supabaseAdmin);
    if (!adminClient) return;

    const payload: Record<string, unknown> = {
      user_id: event.userId ?? null,
      ip_address: event.ip || null,
      user_agent: event.userAgent || null,
      event_type: `login_${event.outcome}`,
      email: event.email,
      reason: event.reason,
    };

    const { error } = await adminClient.from('auth_logs').insert([payload]);
    if (!error) return;

    // Backward-compatible fallback when auth_logs is unavailable in older environments.
    await adminClient.from('login_events').insert([
      {
        user_id: event.userId ?? null,
        ip_address: event.ip || null,
        user_agent: event.userAgent || null,
      },
    ]);
  } catch {
    // best-effort only; auth path should never fail due to audit logging
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  if (!enforceSameOrigin(req, res)) return;

  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const safeEmail = sanitizeEmail(email);
  const ipRaw = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ip = (Array.isArray(ipRaw) ? ipRaw[0] : ipRaw.split(',')[0]).trim();
  const userAgent = String(req.headers['user-agent'] || '');

  const blockByIpKey = `login:block:ip:${ip}`;
  const blockByEmailKey = `login:block:email:${safeEmail}`;
  if ((await redis.get(blockByIpKey)) || (await redis.get(blockByEmailKey))) {
    await recordLoginAudit({
      email: safeEmail,
      ip,
      userAgent,
      outcome: 'blocked',
      reason: 'temporary_lockout',
    });
    return res.status(429).json({ error: 'Too many failed login attempts. Please try again later.' });
  }

  const risk = await evaluateRisk({ ip, userAgent, email: safeEmail });
  if (risk.score >= riskThreshold) {
    console.warn('Login attempt flagged', { ip, userAgent, email: safeEmail, score: risk.score });
    incrementFlaggedLogin();
    await recordLoginAudit({
      email: safeEmail,
      ip,
      userAgent,
      outcome: 'blocked',
      reason: 'risk_engine_block',
    });
    return res.status(403).json({ error: 'Login blocked due to suspicious activity.' });
  }

  const failByIpKey = `login:fail:ip:${ip}`;
  const failByEmailKey = `login:fail:email:${safeEmail}`;

  const supabase = createServerSupabaseClient(req, res);
  const { data, error } = await supabase.auth.signInWithPassword({ email: safeEmail, password });
  if (error || !data.session) {
    const [ipAttempts, emailAttempts] = await Promise.all([
      redis.incr(failByIpKey),
      redis.incr(failByEmailKey),
    ]);

    await Promise.all([
      redis.expire(failByIpKey, ATTEMPT_WINDOW_SEC),
      redis.expire(failByEmailKey, ATTEMPT_WINDOW_SEC),
    ]);

    const shouldBlock = ipAttempts >= MAX_ATTEMPTS || emailAttempts >= MAX_ATTEMPTS;
    if (shouldBlock) {
      await Promise.all([
        redis.del(failByIpKey),
        redis.del(failByEmailKey),
        redis.incr(blockByIpKey),
        redis.incr(blockByEmailKey),
      ]);
      await Promise.all([
        redis.expire(blockByIpKey, BLOCK_TIME_SEC),
        redis.expire(blockByEmailKey, BLOCK_TIME_SEC),
      ]);
    }

    await recordLoginAudit({
      email: safeEmail,
      ip,
      userAgent,
      outcome: shouldBlock ? 'blocked' : 'failed',
      reason: shouldBlock ? 'max_failed_attempts' : 'invalid_credentials',
    });

    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  await Promise.all([
    redis.del(failByIpKey),
    redis.del(failByEmailKey),
    redis.del(blockByIpKey),
    redis.del(blockByEmailKey),
  ]);

  await recordLoginAudit({
    email: safeEmail,
    ip,
    userAgent,
    outcome: 'success',
    reason: 'authenticated',
    userId: data.user?.id ?? null,
  });

  return res.status(200).json({ ok: true });
}
