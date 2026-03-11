export type ApiInterceptorContext = {
  url: string;
  init: RequestInit;
  attempt: number;
};

export type ApiResponseInterceptorContext<T = unknown> = {
  url: string;
  init: RequestInit;
  attempt: number;
  status: number;
  data: T;
};

export type ApiError = {
  name: 'ApiError';
  message: string;
  status: number;
  code?: string;
  details?: unknown;
  url: string;
  method: string;
  retriable: boolean;
};

export type ApiResult<T> = {
  ok: true;
  status: number;
  data: T;
  headers: Headers;
};

export type TokenProvider = () => string | null | Promise<string | null>;

const JSON_HEADERS = {
  'Content-Type': 'application/json',
} as const;

const DEFAULT_RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

let tokenProvider: TokenProvider = () => {
  if (typeof document === 'undefined') return null;
  const cookieToken = readTokenFromCookie(['auth_token', 'access_token', 'sb-access-token']);
  if (cookieToken) return cookieToken;

  try {
    const supabaseRaw = localStorage.getItem('sb-access-token');
    if (supabaseRaw) return supabaseRaw;
  } catch {
    return null;
  }

  return null;
};

const requestInterceptors: Array<(ctx: ApiInterceptorContext) => void> = [];
const responseInterceptors: Array<(ctx: ApiResponseInterceptorContext) => void> = [];

export function setApiTokenProvider(provider: TokenProvider) {
  tokenProvider = provider;
}

export function addRequestInterceptor(interceptor: (ctx: ApiInterceptorContext) => void) {
  requestInterceptors.push(interceptor);
  return () => {
    const idx = requestInterceptors.indexOf(interceptor);
    if (idx >= 0) requestInterceptors.splice(idx, 1);
  };
}

export function addResponseInterceptor(interceptor: (ctx: ApiResponseInterceptorContext) => void) {
  responseInterceptors.push(interceptor);
  return () => {
    const idx = responseInterceptors.indexOf(interceptor);
    if (idx >= 0) responseInterceptors.splice(idx, 1);
  };
}

export async function request<T>(
  url: string,
  init: RequestInit & { parseAs?: 'auto' | 'json' | 'text' | 'raw'; retries?: number } = {},
): Promise<ApiResult<T>> {
  const { parseAs = 'auto', retries = 2, ...rest } = init;
  const method = (rest.method || 'GET').toUpperCase();

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const headers = new Headers(rest.headers || {});
    const token = await tokenProvider();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const requestInit: RequestInit = {
      credentials: rest.credentials ?? 'include',
      ...rest,
      headers,
    };

    const reqCtx: ApiInterceptorContext = { url, init: requestInit, attempt };
    requestInterceptors.forEach((interceptor) => interceptor(reqCtx));

    try {
      const response = await fetch(url, requestInit);
      const data = await parseResponseBody(response, parseAs);

      if (!response.ok) {
        const err = createApiError(response, data, url, method);
        if (shouldRetry(response.status, attempt, retries)) {
          await delay(backoff(attempt));
          continue;
        }
        throw err;
      }

      const resCtx: ApiResponseInterceptorContext<T> = {
        url,
        init: requestInit,
        attempt,
        status: response.status,
        data: data as T,
      };
      responseInterceptors.forEach((interceptor) => interceptor(resCtx));

      return {
        ok: true,
        status: response.status,
        data: data as T,
        headers: response.headers,
      };
    } catch (error) {
      if (isApiError(error)) throw error;

      if (attempt < retries) {
        await delay(backoff(attempt));
        continue;
      }

      throw {
        name: 'ApiError',
        message: error instanceof Error ? error.message : 'Network request failed',
        status: 0,
        url,
        method,
        retriable: true,
      } satisfies ApiError;
    }
  }

  throw {
    name: 'ApiError',
    message: 'Request failed after retries',
    status: 0,
    url,
    method,
    retriable: false,
  } satisfies ApiError;
}

export function isApiError(error: unknown): error is ApiError {
  return !!error && typeof error === 'object' && (error as ApiError).name === 'ApiError';
}

function createApiError(response: Response, data: unknown, url: string, method: string): ApiError {
  const asObject = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  const message =
    (typeof asObject?.error === 'string' && asObject.error) ||
    (typeof asObject?.message === 'string' && asObject.message) ||
    `HTTP ${response.status}`;

  return {
    name: 'ApiError',
    message,
    status: response.status,
    code: typeof asObject?.code === 'string' ? asObject.code : undefined,
    details: asObject?.details,
    url,
    method,
    retriable: DEFAULT_RETRY_STATUS.has(response.status),
  };
}

async function parseResponseBody(response: Response, parseAs: 'auto' | 'json' | 'text' | 'raw') {
  if (parseAs === 'raw') return response;
  if (parseAs === 'text') return response.text();
  if (parseAs === 'json') return response.json();

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  if (contentType.startsWith('text/')) {
    return response.text();
  }

  if (response.status === 204) return null;

  return response.text().catch(() => null);
}

function shouldRetry(status: number, attempt: number, maxRetries: number) {
  return attempt < maxRetries && DEFAULT_RETRY_STATUS.has(status);
}

function backoff(attempt: number) {
  const baseMs = 250 * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 80);
  return baseMs + jitter;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readTokenFromCookie(keys: string[]) {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';').map((chunk) => chunk.trim());
  for (const key of keys) {
    const token = cookies.find((item) => item.startsWith(`${key}=`));
    if (token) return decodeURIComponent(token.slice(key.length + 1));
  }
  return null;
}

export const api = {
  auth: {
    login: (payload: { email: string; password: string }) =>
      request<{ session?: { access_token: string; refresh_token: string }; mfaRequired?: boolean; error?: string }>(
        '/api/auth/login',
        { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) },
      ),
    setSession: (session: unknown) =>
      request<{ ok?: boolean; error?: string }>('/api/auth/set-session', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ event: 'SIGNED_IN', session }),
      }),
    loginEvent: () => request<{ ok?: boolean; error?: string }>('/api/auth/login-event', { method: 'POST' }),
    otpLimit: (payload: { key: string; action: string; increment?: boolean }) =>
      request<{ allowed?: boolean; error?: string }>('/api/auth/otp-limit', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      }),
  },
  studyBuddy: {
    createSession: (payload: { userId: string | null; items: unknown[] }) =>
      request('/api/study-buddy/sessions', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      }),
    getSession: (id: string) => request(`/api/study-buddy/sessions/${id}`),
    startSession: (id: string) => request(`/api/study-buddy/sessions/${id}/start`, { method: 'POST' }),
  },
  admin: {
    speakingAttempts: {
      list: (search = '') => {
        const params = new URLSearchParams();
        if (search) params.set('q', search);
        return request(`/api/admin/speaking/attempts?${params.toString()}`);
      },
      detail: (id: string) => request(`/api/admin/speaking/attempts/${id}`),
    },
  },
  billing: {
    cancelSubscription: () => request<{ ok?: boolean; error?: string }>('/api/billing/cancel-subscription', { method: 'POST' }),
  },
  payments: {
    createIntent: (payload: unknown) =>
      request<{ clientSecret?: string; error?: string }>('/api/payments/create-intent', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      }),
    vault: (payload: unknown) =>
      request<{ ok?: boolean; error?: string; details?: string }>('/api/payments/vault', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      }),
  },
  subscription: {
    status: () => request('/api/subscription/active'),
    portal: () => request('/api/subscriptions/portal'),
    summary: () => request('/api/subscriptions'),
    counters: () => request('/api/counters'),
  },
};
