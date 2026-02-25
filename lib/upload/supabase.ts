import type { StorageError } from '@supabase/storage-js';

export type UploadRetryOptions = {
  /** Total number of attempts (initial try + retries). Default: 3 */
  maxAttempts?: number;
  /** Initial delay before the first retry in milliseconds. Default: 400ms */
  baseDelayMs?: number;
  /** Multiplier applied to the delay after each failed attempt. Default: 2 */
  backoffFactor?: number;
  /** Optional AbortSignal to cancel in-flight retries. */
  signal?: AbortSignal;
  /** Optional hook invoked before each retry (after the first failure). */
  onRetry?: (attempt: number, error: StorageError) => void;
};

async function wait(ms: number, signal?: AbortSignal) {
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Wraps a Supabase Storage upload request with exponential backoff retries.
 */
export async function uploadWithRetry<T>(
  uploadFn: () => Promise<{ data: T; error: StorageError | null }>,
  options: UploadRetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 400,
    backoffFactor = 2,
    signal,
    onRetry,
  } = options;

  let attempt = 0;
  let delay = baseDelayMs;
  let lastError: StorageError | null = null;

  while (attempt < maxAttempts) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const { data, error } = await uploadFn();
    if (!error) {
      return data;
    }

    lastError = error;
    attempt += 1;
    if (attempt >= maxAttempts) break;

    onRetry?.(attempt, error);
    await wait(delay, signal);
    delay *= backoffFactor;
  }

  throw lastError ?? new Error('Upload failed');
}
