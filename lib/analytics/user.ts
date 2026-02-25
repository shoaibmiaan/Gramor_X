// lib/analytics/user.ts
import type { AnalyticsEventName, AnalyticsProps } from './events';
import { track } from './track';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type UserEventPayload = {
  userId: string;
  step: number | null;
  delta: number | null;
} & AnalyticsProps;

let cachedUserId: string | null = null;

async function resolveUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  try {
    const {
      data: { session },
    } = await supabaseBrowser.auth.getSession();
    const id = session?.user?.id;
    if (id) {
      cachedUserId = id;
      return id;
    }
  } catch (err) {
    console.warn('analytics:user resolveUserId failed', err);
  }

  cachedUserId = 'anonymous';
  return cachedUserId;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withRetry<T>(fn: () => Promise<T> | T, attempts = 3, delayMs = 150): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < attempts) {
    try {
      return await Promise.resolve(fn());
    } catch (err) {
      lastError = err;
      attempt += 1;
      if (attempt >= attempts) break;
      await wait(delayMs * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('analytics retry failed');
}

export async function emitUserEvent(
  event: AnalyticsEventName,
  payload: Partial<Omit<UserEventPayload, 'userId'>> = {},
): Promise<void> {
  const userId = await resolveUserId();
  const body: AnalyticsProps = {
    userId,
    step: payload.step ?? null,
    delta: payload.delta ?? null,
    ...payload,
  };

  try {
    await withRetry(() => {
      track(event, body);
    });
  } catch (err) {
    console.warn('analytics:user emit failed', event, err);
  }
}

