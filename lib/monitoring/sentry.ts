import { env, isBrowser } from '@/lib/env';

type SentryModule = {
  init?: (options: Record<string, unknown>) => void;
  captureException?: (err: unknown, scope?: Record<string, unknown>) => void;
};

const moduleId = '@sentry/nextjs';
const dynamicImport = Function(
  'moduleId',
  'return import(moduleId);'
) as (id: string) => Promise<SentryModule>;

let sentryPromise: Promise<SentryModule | null> | null = null;

async function loadSentry(): Promise<SentryModule | null> {
  if (!sentryPromise) {
    sentryPromise = dynamicImport(moduleId).catch(() => null);
  }
  return sentryPromise;
}

export function initSentry() {
  if (!isBrowser || !env.NEXT_PUBLIC_SENTRY_DSN) return;
  if ((globalThis as any).__sentry_inited) return;

  loadSentry()
    .then((Sentry) => {
      if (!Sentry?.init) return;
      Sentry.init({ dsn: env.NEXT_PUBLIC_SENTRY_DSN });
      (globalThis as any).__sentry_inited = true;
    })
    .catch(() => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Sentry init skipped: module not available.');
      }
    });
}

export function captureException(err: unknown, context?: Record<string, any>) {
  loadSentry()
    .then((Sentry) => {
      if (!Sentry?.captureException) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Sentry module unavailable, falling back to console.error', err, context);
        }
        return;
      }
      Sentry.captureException(err, { extra: context || {} });
    })
    .catch(() => {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to load Sentry module', err, context);
      }
    });
}
