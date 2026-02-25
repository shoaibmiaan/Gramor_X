import { Alert } from '@/components/design-system/Alert';

export function OfflineOnlyBanner() {
  return (
    <Alert variant="warning" title="Saved on this device">
      Your submission couldn’t reach our servers. It will sync automatically when you’re back online.
    </Alert>
  );
}
