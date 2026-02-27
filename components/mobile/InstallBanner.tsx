import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { track } from '@/lib/analytics/track';
import type { InstallPromptState } from '@/hooks/useInstallPrompt';

export type InstallBannerProps = {
  promptEvent: InstallPromptState['promptEvent'];
  onComplete?: (outcome: 'accepted' | 'dismissed') => void;
  onDismiss?: () => void;
};

export function InstallBanner({ promptEvent, onComplete, onDismiss }: InstallBannerProps) {
  const [prompting, setPrompting] = useState(false);

  const platformLabel = useMemo(() => {
    if (typeof navigator === 'undefined') return 'your device';
    const platform = (navigator as any)?.userAgentData?.platform ?? navigator.platform ?? 'device';
    if (/android/i.test(platform)) return 'Android';
    if (/iphone|ipad|ios/i.test(platform)) return 'iOS';
    return 'your device';
  }, []);

  useEffect(() => {
    if (!promptEvent) return;
    track('mobile.install_prompt.shown');
  }, [promptEvent]);

  const handleInstall = useCallback(async () => {
    if (!promptEvent) return;
    setPrompting(true);
    try {
      track('mobile.install_prompt.request');
      await promptEvent.prompt();
      const result = await promptEvent.userChoice;
      track('mobile.install_prompt.result', { outcome: result.outcome, platform: result.platform });
      onComplete?.(result.outcome);
    } catch (error) {
      track('mobile.install_prompt.result', { outcome: 'error', message: (error as Error).message });
    } finally {
      setPrompting(false);
    }
  }, [promptEvent, onComplete]);

  const handleDismiss = useCallback(() => {
    track('mobile.install_prompt.dismissed');
    onDismiss?.();
    onComplete?.('dismissed');
  }, [onComplete, onDismiss]);

  if (!promptEvent) return null;

  return (
    <Card padding="lg" className="border-border/70">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Install app</p>
          <h3 className="text-lg font-semibold text-foreground">Use GramorX like a native app</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Install to keep the exam room handy offline, and launch instantly from your {platformLabel} home screen.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button size="lg" variant="primary" onClick={handleInstall} loading={prompting}>
            Install app
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            Not now
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default InstallBanner;
