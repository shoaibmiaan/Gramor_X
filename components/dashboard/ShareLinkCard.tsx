import React from 'react';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';

type ShareStatus = 'idle' | 'loading' | 'success' | 'error';

export function ShareLinkCard() {
  const [token, setToken] = React.useState<string | null>(null);
  const [link, setLink] = React.useState('');
  const [status, setStatus] = React.useState<ShareStatus>('idle');
  const [message, setMessage] = React.useState<string | null>(null);
  const isMounted = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      if (!isMounted.current) return;
      setMessage(null);
      if (status === 'loading') {
        setStatus('idle');
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [message, status]);

  const generate = React.useCallback(async () => {
    if (!isMounted.current) return;
    setStatus('loading');
    setMessage(null);
    try {
      const res = await fetch('/api/progress/share', { method: 'POST' });
      const data = (await res.json().catch(() => null)) as { token?: string; error?: string } | null;
      if (!res.ok || !data?.token) {
        throw new Error(data?.error || 'Unable to generate a shareable link right now.');
      }

      const base =
        process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
      const shareLink = normalizedBase ? `${normalizedBase}/progress/${data.token}` : `/progress/${data.token}`;

      if (!isMounted.current) return;
      setToken(data.token);
      setLink(shareLink);
      setStatus('success');
      setMessage('Link ready—copy and share your progress.');
    } catch (error: any) {
      if (!isMounted.current) return;
      setToken(null);
      setLink('');
      setStatus('error');
      setMessage(error?.message || 'Unable to generate a shareable link.');
    }
  }, []);

  const copy = React.useCallback(async () => {
    if (!link) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else if (typeof window !== 'undefined') {
        window.prompt('Copy this link to share your progress', link);
      } else {
        throw new Error('Clipboard access is unavailable.');
      }
      if (!isMounted.current) return;
      setStatus('success');
      setMessage('Copied to clipboard. Paste it anywhere to share.');
    } catch (error: any) {
      if (!isMounted.current) return;
      setStatus('error');
      setMessage(error?.message || 'Unable to copy the link automatically.');
    }
  }, [link]);

  return (
    <Card className="rounded-ds-2xl p-6">
      <h2 className="mb-4 font-slab text-h2">Share progress</h2>
      {token ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            readOnly
            value={link}
            className="flex-1 rounded border border-border/60 bg-transparent p-2 text-small"
            aria-label="Shareable progress link"
          />
          <Button onClick={copy} variant="secondary" className="rounded-ds-xl sm:w-auto" disabled={status === 'loading'}>
            Copy
          </Button>
        </div>
      ) : (
        <Button onClick={generate} variant="primary" className="rounded-ds-xl" disabled={status === 'loading'}>
          {status === 'loading' ? 'Generating…' : 'Generate link'}
        </Button>
      )}
      {message ? (
        <p
          role="status"
          aria-live="polite"
          className={`mt-3 text-xs ${status === 'error' ? 'text-danger' : 'text-muted-foreground'}`}
        >
          {message}
        </p>
      ) : null}
    </Card>
  );
}

export default ShareLinkCard;
