import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { track } from '@/lib/analytics/track';
import { isBrowser } from '@/lib/env';

const NOTIFICATION_AVAILABLE = () => isBrowser && 'Notification' in window;

export type PushOptInCardProps = {
  onGranted?: () => void;
  onDismiss?: () => void;
};

export function PushOptInCard({ onGranted, onDismiss }: PushOptInCardProps) {
  const [status, setStatus] = useState<NotificationPermission>(() =>
    NOTIFICATION_AVAILABLE() ? Notification.permission : 'default',
  );
  const [requesting, setRequesting] = useState(false);

  const permissionLabel = useMemo(() => {
    switch (status) {
      case 'granted':
        return 'Push alerts enabled';
      case 'denied':
        return 'Push alerts blocked';
      default:
        return 'Push alerts disabled';
    }
  }, [status]);

  useEffect(() => {
    if (!NOTIFICATION_AVAILABLE()) return;
    track('mobile.push_opt_in.shown', { permission: Notification.permission });
  }, []);

  const handleEnable = useCallback(async () => {
    if (!NOTIFICATION_AVAILABLE()) {
      track('mobile.push_opt_in.permission', { permission: 'unsupported' });
      onGranted?.();
      return;
    }

    setRequesting(true);
    try {
      track('mobile.push_opt_in.request', { permission: Notification.permission });
      const permission = await Notification.requestPermission();
      setStatus(permission);
      track('mobile.push_opt_in.permission', { permission });
      if (permission === 'granted') {
        onGranted?.();
      }
    } catch (error) {
      track('mobile.push_opt_in.permission', { permission: 'error', error: (error as Error).message });
    } finally {
      setRequesting(false);
    }
  }, [onGranted]);

  const handleDismiss = useCallback(() => {
    track('mobile.push_opt_in.dismissed', { permission: status });
    onDismiss?.();
  }, [onDismiss, status]);

  if (!NOTIFICATION_AVAILABLE()) {
    return null;
  }

  if (status === 'granted') {
    return (
      <Card padding="lg" className="border-success/40 bg-success/10">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-success">Push ready</p>
          <h3 className="text-base font-semibold text-foreground">You&apos;ll receive grading alerts</h3>
          <p className="text-sm text-muted-foreground">
            Thanks! We&apos;ll let you know instantly when writing scores or AI feedback are available.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="border-border/70">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stay notified</p>
          <h3 className="text-lg font-semibold text-foreground">Enable push alerts</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ll remind you when it&apos;s time to submit, and send writing score updates instantly.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button size="lg" variant="primary" onClick={handleEnable} loading={requesting}>
            Turn on alerts
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            Maybe later
          </Button>
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Status: {permissionLabel}
        </p>
      </div>
    </Card>
  );
}

export default PushOptInCard;
