// lib/http.ts
export type GXErrorCode =
  | 'QUOTA_EXCEEDED'
  | 'PAYMENT_REQUIRED'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'INVALID_REQUEST'
  | 'UNKNOWN';

export type HttpError = {
  ok: false;
  status: number;
  error: string;                 // human-readable
  code?: GXErrorCode;            // e.g., QUOTA_EXCEEDED
  meta?: Record<string, any>;    // module, remaining, resetAt, etc.
  headers?: Record<string, string>;
};

type MaybeGXPayload =
  | { error?: { code?: string; message?: string; meta?: Record<string, any> } }
  | { error?: string }
  | Record<string, any>
  | null;

function safeParse(text: string): MaybeGXPayload {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Fetch wrapper:
 * - includes credentials
 * - parses JSON safely
 * - throws HttpError with { status, error, code, meta }
 */
export async function api<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    credentials: 'include',
    ...init,
  });

  const raw = await res.text();
  const data = safeParse(raw);

  if (res.ok) return (data as T) ?? (null as T);

  // structured error extraction
  const headerCode = res.headers.get('X-GX-Error-Code') || undefined;
  const payloadCode =
    (data && typeof data === 'object' && 'error' in data && (data as any).error?.code) || undefined;

  const code = (payloadCode || headerCode || 'UNKNOWN') as GXErrorCode;

  const message =
    (data &&
      typeof data === 'object' &&
      'error' in data &&
      ((data as any).error?.message ||
        (typeof (data as any).error === 'string' ? (data as any).error : ''))) ||
    res.statusText ||
    'Request failed';

  const meta =
    (data && typeof data === 'object' && 'error' in data && (data as any).error?.meta) || undefined;

  const headersObj: Record<string, string> = {};
  res.headers.forEach((v, k) => (headersObj[k] = v));

  const err: HttpError = {
    ok: false,
    status: res.status,
    error: message,
    code,
    meta,
    headers: headersObj,
  };
  throw err;
}

/** Quota helpers */
export function isQuotaExceeded(err: unknown): err is HttpError & { code: 'QUOTA_EXCEEDED' } {
  return !!err && typeof err === 'object' && (err as HttpError).code === 'QUOTA_EXCEEDED';
}

export function buildQuotaPricingURL(opts: {
  from: string;
  module?: string;          // e.g., 'writing'
  remaining?: number | string;
  resetAtISO?: string | null;
}): string {
  const params = new URLSearchParams({
    reason: 'quota_exhausted',
    module: String(opts.module ?? 'writing'),
    from: opts.from || '/',
  });
  if (opts.remaining !== undefined) params.set('remaining', String(opts.remaining));
  if (opts.resetAtISO) params.set('resetAt', opts.resetAtISO);
  return `/pricing?${params.toString()}`;
}

// Optional helper to build query strings safely
export function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    sp.set(k, String(v));
  });
  return sp.toString();
}
