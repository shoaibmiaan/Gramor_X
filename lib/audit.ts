import type { NextApiRequest } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type AuditEventInput = {
  userId?: string | null;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function requestIp(req?: NextApiRequest): string | null {
  if (!req) return null;
  const raw = req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? null;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw.split(',')[0]?.trim() ?? null;
}

function requestUserAgent(req?: NextApiRequest): string | null {
  if (!req) return null;
  const raw = req.headers['user-agent'] ?? null;
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

export async function logEvent(
  payload: AuditEventInput,
  options?: { req?: NextApiRequest; supabase?: SupabaseClient<any> },
): Promise<void> {
  try {
    const client = options?.supabase ?? supabaseAdmin;
    await client.from('audit_logs').insert({
      user_id: payload.userId ?? null,
      action: payload.action,
      resource: payload.resource ?? null,
      resource_id: payload.resourceId ?? null,
      old_data: payload.oldData ?? null,
      new_data: payload.newData ?? null,
      metadata: payload.metadata ?? null,
      ip_address: payload.ipAddress ?? requestIp(options?.req),
      user_agent: payload.userAgent ?? requestUserAgent(options?.req),
    });
  } catch {
    // fire-and-forget; auditing should not break request path
  }
}

export async function logLogin(params: {
  userId?: string | null;
  email?: string | null;
  outcome: 'success' | 'failed' | 'blocked';
  reason?: string | null;
  req?: NextApiRequest;
}) {
  await logEvent(
    {
      userId: params.userId ?? null,
      action: params.outcome === 'success' ? 'login_success' : 'login_failed',
      resource: 'auth',
      metadata: {
        email: params.email ?? null,
        outcome: params.outcome,
        reason: params.reason ?? null,
      },
    },
    { req: params.req },
  );
}

export async function logLogout(userId: string, req?: NextApiRequest) {
  await logEvent({ userId, action: 'logout', resource: 'auth' }, { req });
}

export async function logSubscriptionChange(params: {
  userId?: string | null;
  eventType: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}) {
  await logEvent({
    userId: params.userId ?? null,
    action: 'subscription_change',
    resource: 'subscriptions',
    oldData: params.oldData ?? null,
    newData: params.newData ?? null,
    metadata: {
      eventType: params.eventType,
      ...(params.metadata ?? {}),
    },
  });
}

// Backward-compatible helper used by existing auth routes.
export async function logAccountAudit(
  supabase: SupabaseClient<any>,
  userId: string,
  action: string,
  metadata: Record<string, unknown> = {},
  extras?: { ip?: string | null; userAgent?: string | null },
) {
  try {
    await supabase.from('account_audit_log').insert({
      user_id: userId,
      action,
      metadata,
      ip_address: extras?.ip ?? null,
      user_agent: extras?.userAgent ?? null,
    });
  } catch {
    // noop
  }

  await logEvent({
    userId,
    action,
    resource: 'account',
    metadata,
    ipAddress: extras?.ip ?? null,
    userAgent: extras?.userAgent ?? null,
  });
}
