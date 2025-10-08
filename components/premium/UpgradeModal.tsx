'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import { Modal } from '@/components/design-system/Modal';
import { Button } from '@/components/design-system/Button';
import { routes } from '@/lib/routes';
import { waitForSubscriptionUpgrade } from '@/lib/auth/session';

type UpgradePromptDetail = {
  feature?: string;
};

const EVENT_NAME = 'premium:prompt';

const highlights = [
  'Unlimited mock exams with AI timing feedback.',
  'Writing & speaking evaluations with actionable scoring breakdowns.',
  'Daily study plan refreshes and personalised drills matched to your weaknesses.',
];

type FeedbackState =
  | { tone: 'info'; message: string }
  | { tone: 'error'; message: string }
  | { tone: 'success'; message: string }
  | null;

export function emitUpgradePrompt(detail?: UpgradePromptDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<UpgradePromptDetail>(EVENT_NAME, { detail }));
}

export default function UpgradeModal() {
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<string | undefined>();
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const clearScheduledClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(
    (delay = 1500) => {
      clearScheduledClose();
      closeTimeoutRef.current = window.setTimeout(() => {
        setOpen(false);
        setFeedback(null);
        closeTimeoutRef.current = null;
      }, delay);
    },
    [clearScheduledClose],
  );

  useEffect(() => {
    const onPrompt = (event: Event) => {
      const detail = (event as CustomEvent<UpgradePromptDetail>).detail;
      setFeature(detail?.feature);
      setFeedback(null);
      setOpen(true);
      clearScheduledClose();
    };

    window.addEventListener(EVENT_NAME, onPrompt as EventListener);
    return () => window.removeEventListener(EVENT_NAME, onPrompt as EventListener);
  }, [clearScheduledClose]);

  useEffect(() => {
    const onUpgraded = () => {
      if (!open) return;
      setFeedback({ tone: 'success', message: 'Premium unlocked! Enjoy your new tools.' });
      setChecking(false);
      scheduleClose(1600);
    };

    window.addEventListener('subscription:tier-updated', onUpgraded as EventListener);
    return () => window.removeEventListener('subscription:tier-updated', onUpgraded as EventListener);
  }, [open, scheduleClose]);

  useEffect(() => () => clearScheduledClose(), [clearScheduledClose]);

  const friendlyFeature = useMemo(() => {
    if (!feature) return 'this premium feature';
    return feature.toLowerCase().startsWith('unlock') ? feature : `${feature}`;
  }, [feature]);

  const handleRefresh = useCallback(async () => {
    setChecking(true);
    setFeedback({ tone: 'info', message: 'Checking your account…' });

    try {
      const result = await waitForSubscriptionUpgrade({ attempts: 4, intervalMs: 2000 });
      if (result) {
        setFeedback({ tone: 'success', message: 'Premium unlocked! Enjoy your new tools.' });
        scheduleClose(1500);
        return;
      }

      setFeedback({
        tone: 'info',
        message: 'Still upgrading your account—try again in a few seconds.',
      });
    } catch (error) {
      console.error('Failed to refresh subscription tier:', error);
      setFeedback({
        tone: 'error',
        message: 'We could not refresh your account yet. Try again shortly or contact support.',
      });
    } finally {
      setChecking(false);
    }
  }, [scheduleClose]);

  const closeModal = useCallback(() => {
    clearScheduledClose();
    setOpen(false);
    setFeedback(null);
  }, [clearScheduledClose]);

  return (
    <Modal open={open} onClose={closeModal} title="Unlock premium access" size="lg">
      <div className="space-y-6">
        <p className="text-small text-mutedText">
          Upgrade to continue with {friendlyFeature}. Premium removes daily limits and adds the tools you use most during
          IELTS prep.
        </p>

        <ul className="space-y-3 text-small text-mutedText">
          {highlights.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {feedback ? (
          <div
            className={`rounded-xl border p-4 text-small ${
              feedback.tone === 'success'
                ? 'border-success/40 bg-success/10 text-success'
                : feedback.tone === 'error'
                  ? 'border-danger/40 bg-danger/10 text-danger'
                  : 'border-primary/30 bg-primary/10 text-primary'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" fullWidth elevateOnHover>
            <Link href={`${routes.pricing()}?ref=upgrade-modal`} onClick={closeModal}>
              View premium plans
            </Link>
          </Button>
          <Button
            variant="soft"
            tone="primary"
            size="lg"
            fullWidth
            onClick={() => {
              void handleRefresh();
            }}
            loading={checking}
            loadingText="Refreshing"
          >
            I upgraded already
          </Button>
        </div>

        <p className="text-center text-caption text-mutedText">
          Need help? <a href="mailto:support@gramorx.com" className="underline">Email support</a> and we&apos;ll get you
          unstuck.
        </p>
      </div>
    </Modal>
  );
}

