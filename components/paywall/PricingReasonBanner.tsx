// components/paywall/PricingReasonBanner.tsx
import * as React from 'react';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';
import { Icon } from '@/components/design-system/Icon';

type Reason =
  | 'plan_required'      // user’s plan doesn’t include this feature
  | 'quota_limit'        // user hit monthly quota for the feature
  | 'trial_ended'        // trial finished
  | 'unknown';

type SnapshotRow = {
  usage_key: string;
  used: number;
  limit: number | null; // null = unlimited
};

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  booster: 'Booster',
  master: 'Master',
};

const FEATURE_LABEL: Record<string, string> = {
  writing_mock_attempts: 'Writing Mock Attempts',
  writing_feedback_ai: 'AI Writing Feedback',
  speaking_mock_attempts: 'Speaking Mock Attempts',
  // add any other usage keys you surface
};

export function PricingReasonBanner() {
  const router = useRouter();
  const { pathname, query } = router;

  // Only show on pricing page
  if (pathname !== '/pricing') return null;

  const reason = String(query.reason ?? 'unknown') as Reason;
  const needPlan = String(query.need ?? '');        // e.g., "starter"
  const fromPath = String(query.from ?? '');        // encoded source path
  const qk = String(query.qk ?? '');                // usage key when quota hit

  const [snapshot, setSnapshot] = useState<SnapshotRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  // If reason is quota, lazily fetch snapshot to show current usage for that key
  useEffect(() => {
    if (reason !== 'quota_limit' || !qk) return;
    let cancelled = false;
    setLoading(true);
    fetch('/api/quota/snapshot')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((j) => {
        if (cancelled) return;
        const rows = Array.isArray(j?.snapshot) ? (j.snapshot as SnapshotRow[]) : [];
        setSnapshot(rows);
      })
      .catch(() => void 0)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reason, qk]);

  const row = useMemo(() => {
    if (!snapshot || !qk) return null;
    return snapshot.find((r) => r.usage_key === qk) || null;
  }, [snapshot, qk]);

  let title = 'Why you’re here';
  let body: React.ReactNode = null;

  if (reason === 'plan_required') {
    // Parenthesized to avoid mixing ?? with ||
    const planPretty = (PLAN_LABEL[needPlan] ?? needPlan) || 'a higher plan';
    body = (
      <>
        The action you tried requires <strong>{planPretty}</strong>.{' '}
        {fromPath ? (
          <>
            You came from <code>{decodeURIComponent(fromPath)}</code>.{' '}
          </>
        ) : null}
        Upgrade below to continue without interruptions.
      </>
    );
  } else if (reason === 'quota_limit') {
    // Parenthesized to avoid mixing ?? with ||
    const label = (FEATURE_LABEL[qk] ?? qk) || 'This feature';
    const suffix = row
      ? row.limit === null
        ? ''
        : ` (${row.used}/${row.limit} used this month)`
      : loading
        ? ' (checking your usage...)'
        : '';
    body = (
      <>
        You’ve reached this month’s quota for <strong>{label}</strong>
        {suffix}.{' '}
        {fromPath ? (
          <>
            You came from <code>{decodeURIComponent(fromPath)}</code>.{' '}
          </>
        ) : null}
        Upgrade below to increase your limits, or wait for next month’s reset.
      </>
    );
  } else if (reason === 'trial_ended') {
    body = (
      <>
        Your trial has ended.{' '}
        {fromPath ? (
          <>
            You came from <code>{decodeURIComponent(fromPath)}</code>.{' '}
          </>
        ) : null}
        Choose a plan below to keep going.
      </>
    );
  } else {
    body = (
      <>
        You were redirected here because your current access doesn’t cover the requested action.
        {fromPath ? (
          <>
            {' '}
            Source: <code>{decodeURIComponent(fromPath)}</code>.
          </>
        ) : null}
      </>
    );
  }

  return (
    <div className="mb-4">
      <Alert
        variant="info"
        icon={<Icon name="info" />}
        title={
          <span className="inline-flex items-center gap-2">
            {title}
            {needPlan ? <Badge>{PLAN_LABEL[needPlan] ?? needPlan}</Badge> : null}
            {qk ? <Badge variant="subtle">{FEATURE_LABEL[qk] ?? qk}</Badge> : null}
          </span>
        }
      >
        {body}
      </Alert>
    </div>
  );
}

export default PricingReasonBanner;
