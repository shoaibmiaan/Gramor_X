// lib/analytics/trackor.server.ts
// Minimal Trackor logging client for server-side analytics events.

type TrackorPayload = Record<string, unknown>;

const endpoint = process.env.TRACKOR_ENDPOINT?.trim() || process.env.TRACKOR_URL?.trim() || null;
const isDebug = process.env.NODE_ENV !== 'production';

async function postToEndpoint(event: string, payload: TrackorPayload) {
  if (!endpoint) {
    if (isDebug && typeof console !== 'undefined') {
      console.debug(`[trackor] ${event}`, payload);
    }
    return;
  }

  const maxAttempts = 3;
  const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      });
      return;
    } catch (error) {
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
        continue;
      }

      if (isDebug && typeof console !== 'undefined') {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[trackor] failed to log ${event}: ${message}`);
      }
    }
  }
}

export const trackor = {
  async log(event: string, payload: TrackorPayload = {}) {
    if (!event) return;
    await postToEndpoint(event, payload);
  },
};

export type { TrackorPayload };
