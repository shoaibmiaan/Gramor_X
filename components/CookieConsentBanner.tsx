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
    <aside className="fixed inset-x-3 bottom-3 z-[100] sm:inset-x-6 sm:bottom-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border/70 bg-card/95 p-4 shadow-2xl backdrop-blur md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Cookie preferences</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              We use essential cookies for sign-in and security. Optional analytics cookies help us improve the experience.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => save('rejected')}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Reject optional
            </button>
            <button
              type="button"
              onClick={() => save('accepted')}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Accept all cookies
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
