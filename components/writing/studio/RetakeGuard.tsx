import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';

export type ReadinessState = {
  pass: boolean;
  missing: string[];
};

export type RetakeGuardRenderProps = {
  canRedraft: boolean;
  loading: boolean;
  missing: string[];
  refresh: () => Promise<void>;
};

export type RetakeGuardProps = {
  initial?: ReadinessState | null;
  onRefreshError?: (error: Error) => void;
  children: (props: RetakeGuardRenderProps) => JSX.Element;
};

export const RetakeGuard = ({ initial = null, onRefreshError, children }: RetakeGuardProps) => {
  const [state, setState] = useState<ReadinessState | null>(initial);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/writing/readiness/evaluate', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to refresh readiness');
      }
      const payload = (await response.json()) as ReadinessState;
      setState(payload);
    } catch (error) {
      if (onRefreshError && error instanceof Error) {
        onRefreshError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [onRefreshError]);

  useEffect(() => {
    if (!initial) {
      void fetchStatus();
    }
  }, [initial, fetchStatus]);

  const missing = state?.missing ?? [];
  const pass = state?.pass ?? false;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="soft" tone={pass ? 'success' : 'warning'} size="sm">
          {pass ? 'Ready for redraft' : 'Action needed'}
        </Badge>
        <Button size="xs" variant="ghost" onClick={() => fetchStatus()} loading={loading}>
          Refresh
        </Button>
      </div>
      {!pass && missing.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {missing.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {children({ canRedraft: pass, loading, missing, refresh: fetchStatus })}
    </div>
  );
};
