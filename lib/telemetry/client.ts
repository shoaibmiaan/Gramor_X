import { captureException } from '@/lib/monitoring/sentry';

type TelemetryPayload = Record<string, unknown>;

type TelemetryWindow = Window & {
  analytics?: { track?: (event: string, payload?: TelemetryPayload) => void };
  gtag?: (command: string, event: string, payload?: TelemetryPayload) => void;
  dataLayer?: Array<Record<string, unknown>>;
};

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'unknown_error';
}

function getWindow(): TelemetryWindow | null {
  if (typeof window === 'undefined') return null;
  return window as TelemetryWindow;
}

export function logClientEvent(event: string, payload: TelemetryPayload = {}) {
  const win = getWindow();

  if (!isProduction()) {
    // eslint-disable-next-line no-console
    console.info('[telemetry:event]', event, payload);
  }

  if (!win) return;

  try {
    win.analytics?.track?.(event, payload);
  } catch {
    // noop
  }

  try {
    win.gtag?.('event', event, payload);
  } catch {
    // noop
  }

  try {
    win.dataLayer?.push({ event, ...payload });
  } catch {
    // noop
  }
}

export function logClientError(error: unknown, context: TelemetryPayload = {}) {
  const errorMessage = toErrorMessage(error);

  if (!isProduction()) {
    // eslint-disable-next-line no-console
    console.error('[telemetry:error]', error, context);
  }

  captureException(error, {
    source: 'client',
    ...context,
  });

  logClientEvent('client.error', {
    ...context,
    error_message: errorMessage,
  });
}
