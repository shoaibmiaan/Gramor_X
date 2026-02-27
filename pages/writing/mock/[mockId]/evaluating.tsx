import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';

interface StatusPayload {
  ok: true;
  attemptId: string;
  status: string;
  submittedAt: string | null;
  aiReady: boolean;
  responses: number;
}

const POLL_INTERVAL = 5000;

const EvaluatingPage: React.FC = () => {
  const router = useRouter();
  const { mockId } = router.query as { mockId?: string };
  const [status, setStatus] = useState<string>('submitted');
  const [responses, setResponses] = useState<number>(0);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mockId) return;
    let active = true;
    let timeout: NodeJS.Timeout | null = null;

    const poll = async () => {
      try {
        const res = await fetch(`/api/mock/writing/status?attemptId=${mockId}`);
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error ?? 'Status check failed');
        }
        const data = (await res.json()) as StatusPayload;
        if (!active) return;
        setStatus(data.status);
        setResponses(data.responses);
        setSubmittedAt(data.submittedAt);
        if (data.aiReady) {
          await router.replace(`/writing/mock/${mockId}/results`);
          return;
        }
        timeout = setTimeout(poll, POLL_INTERVAL);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message ?? 'Unable to check status');
        timeout = setTimeout(poll, POLL_INTERVAL * 2);
      }
    };

    void poll();

    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [mockId, router]);

  const submittedLabel = useMemo(() => {
    if (!submittedAt) return 'Just now';
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(submittedAt));
    } catch {
      return submittedAt;
    }
  }, [submittedAt]);

  const handleViewResults = () => {
    if (!mockId) return;
    void router.push(`/writing/mock/${mockId}/results`);
  };

  const handleReturn = () => {
    void router.push('/writing/mock');
  };

  if (!mockId) {
    return null;
  }

  return (
    <Container className="py-16">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 text-center">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold text-foreground">We&apos;re grading your attempt</h1>
          <p className="text-sm text-muted-foreground">
            Hang tight while our AI examiners process your essays. This usually takes less than a minute.
          </p>
        </div>

        <Card className="rounded-ds-2xl border border-border/60 bg-background/80 p-6 text-left">
          <dl className="grid gap-4 text-sm text-muted-foreground">
            <div>
              <dt className="font-medium text-foreground">Attempt ID</dt>
              <dd className="font-mono text-xs text-muted-foreground">{mockId}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Status</dt>
              <dd className="capitalize">{status.replace(/_/g, ' ')}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Responses received</dt>
              <dd>{responses}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Submitted</dt>
              <dd>{submittedLabel}</dd>
            </div>
          </dl>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </Card>

        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={handleViewResults} variant="primary" className="rounded-ds">
            Check results
          </Button>
          <Button onClick={handleReturn} variant="ghost" className="rounded-ds">
            Back to library
          </Button>
        </div>
      </div>
    </Container>
  );
};

export default EvaluatingPage;
