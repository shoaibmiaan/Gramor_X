// lib/obs/logger.ts
// Lightweight structured logger for API handlers.

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown> & {
  requestId?: string;
  correlationId?: string;
  userId?: string;
};

const randomId = () => Math.random().toString(36).slice(2, 10);

const consoleMethod: Record<LogLevel, 'debug' | 'log' | 'warn' | 'error'> = {
  debug: 'debug',
  info: 'log',
  warn: 'warn',
  error: 'error',
};

function emit(level: LogLevel, route: string, base: LogContext, message: string, extra?: LogContext) {
  const method = consoleMethod[level] ?? 'log';
  const payload = {
    level,
    route,
    message,
    timestamp: new Date().toISOString(),
    ...base,
    ...(extra ?? {}),
  };

  if (process.env.NODE_ENV === 'test') {
    // eslint-disable-next-line no-console
    console[method](message, extra ?? {});
    return;
  }

  try {
    // eslint-disable-next-line no-console
    console[method](JSON.stringify(payload));
  } catch (error) {
    // eslint-disable-next-line no-console
    console[method](`[logger] ${message}`, extra ?? {});
  }
}

export type RequestLogger = {
  debug: (message: string, meta?: LogContext) => void;
  info: (message: string, meta?: LogContext) => void;
  warn: (message: string, meta?: LogContext) => void;
  error: (message: string, meta?: LogContext) => void;
  child: (meta: LogContext) => RequestLogger;
};

export function createRequestLogger(route: string, context: LogContext = {}): RequestLogger {
  const correlationId = context.correlationId ?? context.requestId ?? randomId();
  const base = { ...context, correlationId };

  const make = (extra: LogContext = {}): RequestLogger => ({
    debug(message, meta) {
      emit('debug', route, { ...base, ...extra }, message, meta);
    },
    info(message, meta) {
      emit('info', route, { ...base, ...extra }, message, meta);
    },
    warn(message, meta) {
      emit('warn', route, { ...base, ...extra }, message, meta);
    },
    error(message, meta) {
      emit('error', route, { ...base, ...extra }, message, meta);
    },
    child(childMeta: LogContext) {
      return make({ ...extra, ...childMeta });
    },
  });

  return make();
}

