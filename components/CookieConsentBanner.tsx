import * as React from 'react';

const STORAGE_KEY = 'gx_cookie_consent_v1';

type ConsentState = 'accepted' | 'rejected' | null;

export default function CookieConsentBanner() {
  const [consent, setConsent] = React.useState<ConsentState>(null);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ConsentState;
      if (saved === 'accepted' || saved === 'rejected') {
        setConsent(saved);
      }
    } catch {
      // noop
    }
  }, []);

  const save = (value: Exclude<ConsentState, null>) => {
    setConsent(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // noop
    }
  };

  if (consent) return null;

  return (
    <aside className="fixed inset-x-4 bottom-4 z-[100] rounded-xl border border-border bg-card p-4 shadow-lg">
      <p className="text-sm text-foreground">
        We use essential cookies to keep GramorX secure and functional. Optional analytics cookies help us improve the platform.
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => save('rejected')} className="rounded border border-border px-3 py-1 text-sm">
          Reject optional
        </button>
        <button onClick={() => save('accepted')} className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground">
          Accept all
        </button>
      </div>
    </aside>
  );
}
