import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { track } from '@/lib/analytics/track';

type Role = 'student'|'teacher'|'admin';
type ModuleKind = 'speaking'|'writing';

type AttemptDetail = {
  id: string;
  user_name: string;
  user_email?: string;
  cohort?: string | null;
  module: ModuleKind;
  task: string;            // e.g., "Task 2" or "Part 2"
  ai_band: number;         // 0–9
  ai_rubric?: {
    task_response?: string;
    coherence?: string;
    lexical?: string;
    grammar?: string;
    pronunciation?: string;
  } | null;
  overridden?: boolean;
  final_band?: number | null;
  override_reason?: string | null;
  created_at: string;      // ISO
  last_activity: string;   // ISO
};

type ApiGet =
  | { ok: true; data: AttemptDetail }
  | { ok: false; error: string };

type ApiPost =
  | { ok: true; data: { final_band: number; reason: string } }
  | { ok: false; error: string };

export default function ReviewAttemptPage() {
  const router = useRouter();
  const { attemptId } = router.query as { attemptId?: string };

  const [roleOk, setRoleOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AttemptDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // form
  const [finalBand, setFinalBand] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [shareTtlHours, setShareTtlHours] = useState<number | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Guard (teacher/admin only)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      const role: Role | undefined =
        (user?.user_metadata?.role as Role | undefined) ||
        (user?.app_metadata?.role as Role | undefined);
      const allowed = role === 'teacher' || role === 'admin';
      setRoleOk(allowed);
      if (!allowed) return;
    })();
  }, []);

  // Load attempt
  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/reviews?attemptId=${encodeURIComponent(attemptId)}`);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json: ApiGet = await res.json();
        if (!json.ok) throw new Error(json.error);
        setData(json.data);
        setFinalBand(json.data.final_band?.toString() ?? '');
        setReason(json.data.override_reason ?? '');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load attempt.');
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId]);

  useEffect(() => {
    if (!data || startedRef.current) return;
    startedRef.current = true;
    track('teacher_review_started', {
      attempt_id: data.id,
      module: data.module,
      ai_band: data.ai_band,
      overridden: Boolean(data.overridden),
    });
  }, [data]);

  useEffect(() => {
    if (!shareCopied) return;
    const timer = window.setTimeout(() => setShareCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [shareCopied]);

  const updatedAt = useMemo(
    () => (data ? new Date(data.last_activity).toLocaleString() : ''),
    [data]
  );

  const shareExpiryLabel = useMemo(() => {
    if (!shareExpiresAt) return null;
    const date = new Date(shareExpiresAt);
    if (Number.isNaN(date.getTime())) return null;
    try {
      return date.toLocaleString();
    } catch {
      return date.toString();
    }
  }, [shareExpiresAt]);

  async function submitOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!attemptId) return;
    const band = Number(finalBand);
    if (Number.isNaN(band) || band < 0 || band > 9) {
      setSavedMsg(null);
      setError('Final band must be a number between 0 and 9.');
      return;
    }
    if (!reason.trim()) {
      setSavedMsg(null);
      setError('Please provide a brief reason for the override.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSavedMsg(null);
    const attemptMeta = data;
    try {
      const res = await fetch(`/api/admin/reviews/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, final_band: band, reason }),
      });
      const json: ApiPost = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.ok ? 'Failed to save' : json.error);
      setSavedMsg('Override saved.');
      // reflect in UI
      setData(prev => prev ? { ...prev, overridden: true, final_band: band, override_reason: reason } : prev);
      if (attemptMeta) {
        track('teacher_review_scored', {
          attempt_id: attemptMeta.id,
          module: attemptMeta.module,
          ai_band: attemptMeta.ai_band,
          final_band: band,
          delta: Number((band - attemptMeta.ai_band).toFixed(2)),
          had_previous_override: Boolean(attemptMeta.final_band),
        });
        track('teacher_review_completed', {
          attempt_id: attemptMeta.id,
          module: attemptMeta.module,
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save override.');
    } finally {
      setSubmitting(false);
    }
  }

  async function createShareLink() {
    if (!attemptId) return;
    setShareLoading(true);
    setShareError(null);
    try {
      const response = await fetch('/api/review/share-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? 'Unable to generate share link');
      }
      setShareUrl(json.data.url);
      setShareExpiresAt(json.data.expiresAt ?? null);
      setShareTtlHours(typeof json.data.ttlHours === 'number' ? json.data.ttlHours : null);
      setShareCopied(false);
      track('review.share.generated', {
        attempt_id: attemptId,
        exam_type: json.data.examType,
        ttl_hours: json.data.ttlHours,
      });
    } catch (err: unknown) {
      setShareError(err instanceof Error ? err.message : 'Unable to generate share link');
    } finally {
      setShareLoading(false);
    }
  }

  async function copyShareLink() {
    if (!shareUrl || !attemptId) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setShareCopied(true);
      setShareError(null);
      track('review.share.copied', { attempt_id: attemptId });
    } catch (err: unknown) {
      setShareError('Unable to copy link');
    }
  }

  return (
    <>
      <Head><title>Admin • Review Attempt | GramorX</title></Head>

      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h1 className="font-slab text-display text-gradient-primary">Review & Override</h1>
              <p className="text-grayish max-w-2xl">Adjust AI score with a reason and keep the audit trail.</p>
            </div>
            <div className="shrink-0">
              <Link href="/admin/reviews" legacyBehavior>
                <Button as="a" variant="secondary" className="rounded-ds">Back to list</Button>
              </Link>
            </div>
          </div>

          {roleOk === false && (
            <Alert variant="warning" title="Access denied" className="mb-6">
              You need a <b>teacher</b> or <b>admin</b> role to open this page.
            </Alert>
          )}

          {error && (
            <Alert variant="warning" title="Heads up" className="mb-6">{error}</Alert>
          )}

          <div className="grid gap-6 md:grid-cols-3">
            {/* Left: Attempt summary */}
            <Card className="p-6 md:col-span-2 rounded-ds-2xl">
              {loading ? (
                <div className="animate-pulse h-5 w-full bg-muted dark:bg-white/10 rounded" />
              ) : !data ? (
                <div className="text-grayish">No data.</div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div>
                      <div className="text-small opacity-80">Student</div>
                      <div className="font-semibold">{data.user_name}</div>
                      <div className="text-small opacity-80">{data.user_email ?? '—'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-small opacity-80">Updated</div>
                      <div className="font-medium">{updatedAt}</div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div className="p-3.5 rounded-ds border border-lightBorder dark:border-white/10">
                      <div className="text-small opacity-80">Module</div>
                      <div className="capitalize font-medium">{data.module}</div>
                    </div>
                    <div className="p-3.5 rounded-ds border border-lightBorder dark:border-white/10">
                      <div className="text-small opacity-80">Task</div>
                      <div className="font-medium">{data.task}</div>
                    </div>
                    <div className="p-3.5 rounded-ds border border-lightBorder dark:border-white/10">
                      <div className="text-small opacity-80">AI band</div>
                      <div className="font-semibold">{data.ai_band.toFixed(1)}</div>
                    </div>
                  </div>

                  <section
                    className="mt-6 rounded-ds border border-lightBorder bg-white/80 p-4 text-lightText shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                    aria-labelledby="share-review-heading"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 id="share-review-heading" className="text-small font-semibold">
                          Share review link
                        </h3>
                        <p className="text-xs opacity-70">
                          Generate a secure link to invite feedback. Links expire automatically.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="rounded-ds"
                        onClick={createShareLink}
                        disabled={shareLoading || !attemptId}
                      >
                        {shareLoading ? 'Generating…' : shareUrl ? 'Refresh link' : 'Generate link'}
                      </Button>
                    </div>

                    {shareUrl && (
                      <div className="mt-4 space-y-2" aria-live="polite">
                        <label htmlFor="review-share-link" className="text-xs font-medium opacity-80">
                          Shareable URL
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            id="review-share-link"
                            value={shareUrl}
                            readOnly
                            className="w-full flex-1 rounded-ds border border-lightBorder bg-white px-3 py-2 text-small text-lightText dark:border-white/10 dark:bg-white/10 dark:text-white"
                            aria-describedby="review-share-hint"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            className="rounded-ds"
                            onClick={copyShareLink}
                          >
                            {shareCopied ? 'Copied!' : 'Copy link'}
                          </Button>
                        </div>
                        <p id="review-share-hint" className="text-xs opacity-70">
                          {shareExpiryLabel
                            ? `Expires ${shareExpiryLabel}`
                            : shareTtlHours
                            ? `Expires in ${shareTtlHours} hours`
                            : 'Expires soon for security.'}
                        </p>
                      </div>
                    )}

                    {(shareError || shareCopied) && (
                      <p
                        className={`mt-2 text-xs ${shareError ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
                        role={shareError ? 'alert' : undefined}
                        aria-live="polite"
                      >
                        {shareError ?? 'Link copied to clipboard.'}
                      </p>
                    )}
                  </section>

                  {data.overridden && (
                    <div className="mt-4">
                      <Badge variant="warning" size="sm">Overridden</Badge>
                    </div>
                  )}

                  {/* Simple rubric readout */}
                  {data.ai_rubric && (
                    <div className="mt-6">
                      <h3 className="font-semibold mb-2">AI Rubric Notes</h3>
                      <ul className="list-disc pl-5 space-y-1 text-body opacity-90">
                        {data.ai_rubric.task_response && <li><b>Task response:</b> {data.ai_rubric.task_response}</li>}
                        {data.ai_rubric.coherence && <li><b>Coherence:</b> {data.ai_rubric.coherence}</li>}
                        {data.ai_rubric.lexical && <li><b>Lexical:</b> {data.ai_rubric.lexical}</li>}
                        {data.ai_rubric.grammar && <li><b>Grammar:</b> {data.ai_rubric.grammar}</li>}
                        {data.ai_rubric.pronunciation && <li><b>Pronunciation:</b> {data.ai_rubric.pronunciation}</li>}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* Right: Override form */}
            <Card className="p-6 rounded-ds-2xl">
              <h3 className="font-semibold mb-3">Set final band</h3>
              <form onSubmit={submitOverride} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 inline-block text-small text-grayish dark:text-grayish">Final band (0–9)</span>
                  <input
                    inputMode="decimal"
                    value={finalBand}
                    onChange={e => setFinalBand(e.target.value)}
                    placeholder="e.g., 6.5"
                    className="w-full rounded-ds border bg-white text-lightText placeholder-gray-500
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:border-primary
                               dark:bg-dark/50 dark:text-white dark:placeholder-white/40 dark:border-purpleVibe/30
                               dark:focus-visible:ring-electricBlue dark:focus:border-electricBlue py-2.5 px-3.5"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 inline-block text-small text-grayish dark:text-grayish">Reason (required)</span>
                  <textarea
                    rows={5}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Explain why you adjusted the band (task achievement, coherence, pronunciation, etc.)"
                    className="w-full rounded-ds border bg-white text-lightText placeholder-gray-500
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:border-primary
                               dark:bg-dark/50 dark:text-white dark:placeholder-white/40 dark:border-purpleVibe/30
                               dark:focus-visible:ring-electricBlue dark:focus:border-electricBlue py-2.5 px-3.5"
                  />
                </label>

                <div className="flex gap-3">
                  <Button type="submit" variant="primary" disabled={submitting} className="rounded-ds">
                    {submitting ? 'Saving…' : 'Save override'}
                  </Button>
                  {!!data?.final_band && (
                    <span className="self-center text-small opacity-80">
                      Current final: <b>{data.final_band.toFixed(1)}</b>
                    </span>
                  )}
                </div>
              </form>

              {savedMsg && <Alert variant="success" title={savedMsg} className="mt-4" />}
              {!savedMsg && !error && (
                <Alert variant="info" className="mt-4">
                  The AI band is preserved for audit. Your override becomes the <b>final</b> band.
                </Alert>
              )}
            </Card>
          </div>
        </Container>
      </section>
    </>
  );
}
