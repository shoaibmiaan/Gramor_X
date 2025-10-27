import * as React from 'react';

import { track } from '@/lib/analytics/track';

type VariantMap = Record<string, React.ReactNode>;

type VariantProps = {
  experiment: string;
  variants: VariantMap;
  initialVariant?: string | null;
  initialHoldout?: boolean;
  initialStatus?: string | null;
  context?: Record<string, unknown>;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
  onVariantResolved?: (variant: string) => void;
};

type VariantContextValue = {
  experiment: string;
  variant: string | null;
  holdout: boolean;
  trackConversion: (metadata?: Record<string, unknown>) => Promise<void>;
};

const VariantContext = React.createContext<VariantContextValue | null>(null);

type EventAction = 'expose' | 'convert';

function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> {
  if (!context) return {};
  try {
    return JSON.parse(JSON.stringify(context)) as Record<string, unknown>;
  } catch {
    const safe: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context)) {
      const type = typeof value;
      if (value === null || type === 'string' || type === 'number' || type === 'boolean') {
        safe[key] = value as unknown;
      }
    }
    return safe;
  }
}

function normalizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  const safe = sanitizeContext(context);
  return Object.keys(safe).length > 0 ? safe : undefined;
}

async function postExperimentEvent(
  experiment: string,
  action: EventAction,
  context?: Record<string, unknown>,
) {
  if (typeof window === 'undefined') return;

  const payload: Record<string, unknown> = { experiment, action };
  if (context && Object.keys(context).length > 0) {
    payload.context = context;
  }

  const body = JSON.stringify(payload);

  if (action === 'expose' && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/exp/assign', blob)) {
        return;
      }
    } catch {
      // ignore beacon fall-through
    }
  }

  try {
    await fetch('/api/exp/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: action === 'convert',
    });
  } catch {
    // non-blocking analytics call
  }
}

async function requestAssignment(
  experiment: string,
  context?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{
  variant: string | null;
  holdout: boolean;
  status: string | null;
}> {
  const body: Record<string, unknown> = { experiment, action: 'assign' };
  if (context && Object.keys(context).length > 0) {
    body.context = context;
  }

  const res = await fetch('/api/exp/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    return { variant: null, holdout: false, status: null };
  }

  const data = (await res.json()) as
    | { ok: true; variant: string; holdout?: boolean; status?: string | null }
    | { ok: false };

  if (data && 'ok' in data && data.ok) {
    return {
      variant: typeof data.variant === 'string' ? data.variant : null,
      holdout: Boolean(data.holdout),
      status: typeof data.status === 'string' ? data.status : null,
    };
  }

  return { variant: null, holdout: false, status: null };
}

export function Variant({
  experiment,
  variants,
  initialVariant = null,
  initialHoldout = false,
  initialStatus = null,
  context,
  fallback = null,
  loading = null,
  onVariantResolved,
}: VariantProps) {
  const [variant, setVariant] = React.useState<string | null>(initialVariant);
  const [holdout, setHoldout] = React.useState<boolean | null>(
    typeof initialHoldout === 'boolean' ? initialHoldout : null,
  );
  const [status, setStatus] = React.useState<string | null>(initialStatus);
  const [isLoading, setIsLoading] = React.useState<boolean>(() => initialVariant == null);

  const assignTrackedRef = React.useRef(false);
  const exposedVariantRef = React.useRef<string | null>(null);

  const preparedContext = React.useMemo(() => normalizeContext(context), [context]);

  React.useEffect(() => {
    setVariant(initialVariant ?? null);
  }, [initialVariant]);

  React.useEffect(() => {
    setHoldout(typeof initialHoldout === 'boolean' ? initialHoldout : null);
  }, [initialHoldout]);

  React.useEffect(() => {
    setStatus(initialStatus ?? null);
  }, [initialStatus]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (variant && holdout !== null) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setIsLoading(true);
    requestAssignment(experiment, preparedContext, controller.signal)
      .then((result) => {
        if (cancelled) return;
        if (result.variant) {
          setVariant(result.variant);
          setHoldout(result.holdout ?? false);
          setStatus(result.status ?? null);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [experiment, preparedContext, variant, holdout]);

  React.useEffect(() => {
    if (!variant) return;
    onVariantResolved?.(variant);
  }, [variant, onVariantResolved]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!variant || holdout === null || holdout) return;

    if (!assignTrackedRef.current) {
      assignTrackedRef.current = true;
      const analyticsPayload: Record<string, unknown> = {
        experiment,
        variant,
      };
      if (status) analyticsPayload.status = status;
      if (preparedContext) analyticsPayload.context = preparedContext;
      track('exp.assign', analyticsPayload);
    }

    if (exposedVariantRef.current === variant) return;
    exposedVariantRef.current = variant;

    const exposurePayload: Record<string, unknown> = {
      experiment,
      variant,
    };
    if (preparedContext) exposurePayload.context = preparedContext;

    track('exp.expose', exposurePayload);
    postExperimentEvent(experiment, 'expose', preparedContext).catch(() => undefined);
  }, [experiment, variant, holdout, status, preparedContext]);

  const trackConversion = React.useCallback(
    async (metadata?: Record<string, unknown>) => {
      if (typeof window === 'undefined') return;
    if (!variant || holdout === null || holdout) return;

      const meta = normalizeContext(metadata);
      const payload: Record<string, unknown> = { experiment, variant };
      if (meta) payload.context = meta;

      track('exp.convert', payload);
      await postExperimentEvent(experiment, 'convert', meta).catch(() => undefined);
    },
    [experiment, variant, holdout],
  );

  const providerValue = React.useMemo<VariantContextValue>(
    () => ({ experiment, variant, holdout: Boolean(holdout), trackConversion }),
    [experiment, variant, holdout, trackConversion],
  );

  const resolvedContent = React.useMemo(() => {
    if (variant && variants[variant]) {
      return variants[variant];
    }
    if (isLoading) return loading;
    return fallback;
  }, [variant, variants, isLoading, loading, fallback]);

  return <VariantContext.Provider value={providerValue}>{resolvedContent}</VariantContext.Provider>;
}

export function useVariantConversion(): (metadata?: Record<string, unknown>) => Promise<void> {
  const ctx = React.useContext(VariantContext);
  return React.useCallback(
    async (metadata?: Record<string, unknown>) => {
      if (!ctx) return;
      await ctx.trackConversion(metadata);
    },
    [ctx],
  );
}

export function useExperimentVariant(): { experiment: string; variant: string | null; holdout: boolean } {
  const ctx = React.useContext(VariantContext);
  if (!ctx) {
    return { experiment: '', variant: null, holdout: false };
  }
  return { experiment: ctx.experiment, variant: ctx.variant, holdout: ctx.holdout };
}
