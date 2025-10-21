export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export interface ApiRequestInit extends RequestInit {
  allowEmpty?: boolean;
}

const DEFAULT_INIT: Pick<RequestInit, 'credentials' | 'cache'> = {
  credentials: 'include',
  cache: 'no-store',
};

const isFormLike = (body: unknown): body is FormData | URLSearchParams =>
  typeof body === 'object' && body !== null && (body instanceof FormData || body instanceof URLSearchParams);

export async function apiFetch<T>(input: RequestInfo | URL, init: ApiRequestInit = {}): Promise<T> {
  const { headers, allowEmpty = false, ...rest } = init;
  const nextHeaders = new Headers(headers ?? {});

  if (!nextHeaders.has('Accept')) {
    nextHeaders.set('Accept', 'application/json');
  }

  if (rest.body && !nextHeaders.has('Content-Type') && !isFormLike(rest.body)) {
    nextHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(input, {
    ...DEFAULT_INIT,
    ...rest,
    headers: nextHeaders,
  });

  const raw = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  let payload: unknown = null;

  if (raw) {
    if (contentType.includes('application/json')) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = raw;
      }
    } else {
      payload = raw;
    }
  } else if (!allowEmpty) {
    payload = null;
  }

  if (!response.ok) {
    const message =
      (typeof payload === 'object' && payload && 'error' in payload && typeof (payload as any).error === 'string'
        ? (payload as any).error
        : response.statusText) || 'Request failed';

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export function createQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item === undefined || item === null || item === '') return;
        search.append(key, String(item));
      });
      return;
    }
    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : '';
}
