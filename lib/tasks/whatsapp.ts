import { createHmac } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import type { Database } from '@/types/supabase';

const FUNCTION_NAME = 'whatsapp-tasks';
const SIGNATURE_HEADER = 'x-gramorx-signature';

export type WhatsAppTaskType = 'test' | 'task';
export type WhatsAppMessageTemplate = 'testPing' | 'taskReminder' | 'optInConfirmation';

export interface WhatsAppMessageContext {
  userName?: string;
  taskName?: string;
  dueAt?: string;
  url?: string;
  customText?: string;
}

export interface WhatsAppDispatchPayload {
  userId: string;
  type?: WhatsAppTaskType;
  message?: string;
  metadata?: Record<string, unknown>;
}

function ensureSecret(): string {
  const secret = env.WHATSAPP_TASKS_SIGNING_SECRET;
  if (!secret) {
    throw new Error('WHATSAPP_TASKS_SIGNING_SECRET is not configured');
  }
  return secret;
}

function formatBody(body: string) {
  return body.replace(/\s+/g, ' ').trim();
}

function appendUrl(body: string, url?: string) {
  const trimmedBody = formatBody(body);
  if (!url) return trimmedBody;
  const trimmedUrl = url.trim();
  return trimmedUrl ? `${trimmedBody}\n${trimmedUrl}` : trimmedBody;
}

export function buildWhatsAppTaskMessage(
  template: WhatsAppMessageTemplate,
  context: WhatsAppMessageContext = {},
): string {
  if (context.customText && context.customText.trim().length > 0) {
    return context.customText.trim();
  }

  const greeting = context.userName ? `${context.userName}, ` : '';

  if (template === 'taskReminder') {
    const descriptor = context.taskName ? `your GramorX task: ${context.taskName}` : 'your GramorX study task';
    let body = `${greeting}here’s ${descriptor}. Reply DONE when you finish!`;
    if (context.dueAt) {
      body += ` Due: ${context.dueAt}.`;
    }
    return appendUrl(body, context.url);
  }

  if (template === 'optInConfirmation') {
    const body = `${greeting}you’re all set to receive WhatsApp study tasks from GramorX. Reply STOP anytime to opt out.`;
    return appendUrl(body, context.url);
  }

  return 'Test message from GramorX: you’ll start receiving WhatsApp tasks here.';
}

export async function dispatchWhatsAppTask(
  client: SupabaseClient<Database>,
  payload: WhatsAppDispatchPayload,
) {
  const secret = ensureSecret();
  const finalPayload: Record<string, unknown> = {
    userId: payload.userId,
    type: payload.type ?? 'test',
  };

  if (payload.message && payload.message.trim().length > 0) {
    finalPayload.message = payload.message.trim();
  }
  if (payload.metadata) {
    finalPayload.metadata = payload.metadata;
  }

  const body = JSON.stringify(finalPayload);
  const signature = createHmac('sha256', secret).update(body).digest('hex');

  return client.functions.invoke(FUNCTION_NAME, {
    body,
    headers: {
      'content-type': 'application/json',
      [SIGNATURE_HEADER]: signature,
    },
  });
}
