import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { WritingEditor } from '@/components/writing/studio';
import type { EvidenceSuggestion, HedgingSuggestion } from '@/lib/writing/crossModule';
import {
  trackClientAttemptSaved,
  trackClientAttemptStarted,
  trackClientAttemptSubmitted,
  trackClientEvidenceViewed,
  trackClientHandwritingUploaded,
  trackClientHedgingViewed,
} from '@/lib/analytics/writing-events';
import { enqueueOfflineDraft, flushOfflineDrafts } from '@/lib/writing/offlineQueue';
import { withPlanPage } from '@/lib/withPlanPage';
import { getServerClient } from '@/lib/supabaseServer';
import { countWords } from '@/lib/storage/drafts';
import { splitParagraphs, type LiveSuggestion } from '@/lib/writing/languageTools';
import type { SaveDraftBody, WritingTaskType } from '@/lib/writing/schemas';
import type { Database } from '@/types/supabase';

const LanguageToolsDock = dynamic(
  () => import('@/components/writing/studio/LanguageToolsDock').then((mod) => mod.LanguageToolsDock),
  { ssr: false, loading: () => <div className="h-24 rounded-2xl bg-muted/40" /> },
);

interface PromptPageProps {
  prompt: {
    id: string;
    slug: string;
    topic: string;
    taskType: WritingTaskType;
    difficulty: number;
    band9Sample: string | null;
    outline: string[];
    createdAt: string;
  };
  attempt: {
    id: string;
    draftText: string;
    wordCount: number;
    timeSpentMs: number;
    status: Database['public']['Enums']['writing_attempt_status'];
    updatedAt: string;
  } | null;
}

const WritingPromptPage = ({ prompt, attempt }: PromptPageProps) => {
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | null>(attempt?.id ?? null);
  const [draftText, setDraftText] = useState<string>(attempt?.draftText ?? '');
  const [wordCount, setWordCount] = useState<number>(attempt?.wordCount ?? 0);
  const [timeSpentMs, setTimeSpentMs] = useState<number>(attempt?.timeSpentMs ?? 0);
  const [status, setStatus] = useState<Database['public']['Enums']['writing_attempt_status']>(attempt?.status ?? 'draft');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [submitState, setSubmitState] = useState<'idle' | 'submitting'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [offlineQueued, setOfflineQueued] = useState(false);
  const [copyAlert, setCopyAlert] = useState<string | null>(null);
  const [bulkPasteDetected, setBulkPasteDetected] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceSuggestion[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [hedging, setHedging] = useState<HedgingSuggestion[]>([]);
  const lastSavedDraft = useRef<string>(attempt?.draftText ?? '');
  const isMounted = useRef<boolean>(false);
  const isTask2 = prompt.taskType === 'task2';

  const sendDraft = useCallback(
    async (payload: SaveDraftBody) => {
      const response = await fetch('/api/writing/attempts/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        throw new Error((details as { error?: string })?.error ?? 'Failed to save draft');
      }
      trackClientAttemptSaved({ attemptId: payload.attemptId, wordCount: payload.wordCount, bulkPaste: bulkPasteDetected });
      setBulkPasteDetected(false);
    },
    [bulkPasteDetected],
  );

  const syncOfflineDrafts = useCallback(async () => {
    await flushOfflineDrafts(async (payload) => {
      try {
        await sendDraft(payload);
        if (payload.attemptId === attemptId) {
          lastSavedDraft.current = payload.draftText;
          if (isMounted.current) {
            setSaveState('saved');
            setError(null);
            setOfflineQueued(false);
          }
        }
        return true;
      } catch {
        return false;
      }
    });
  }, [attemptId, sendDraft]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadEvidence = useCallback(async () => {
    if (!attemptId || !isTask2) return;
    setEvidenceLoading(true);
    try {
      const response = await fetch('/api/writing/cross/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId: prompt.id, topic: prompt.topic }),
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { evidence: EvidenceSuggestion[] };
      setEvidence(payload.evidence ?? []);
      trackClientEvidenceViewed(payload.evidence?.length ?? 0);
    } catch (_error) {
      setError('Unable to load evidence suggestions right now.');
    } finally {
      setEvidenceLoading(false);
    }
  }, [attemptId, isTask2, prompt.id, prompt.topic]);

  useEffect(() => {
    if (!attemptId || !isTask2) return;
    void loadEvidence();
  }, [attemptId, isTask2, loadEvidence]);

  useEffect(() => {
    let active = true;
    const fetchHedging = async () => {
      try {
        const response = await fetch('/api/writing/cross/hedging');
        if (!response.ok) return;
        const payload = (await response.json()) as { suggestions: HedgingSuggestion[] };
        if (active) {
          setHedging(payload.suggestions ?? []);
          trackClientHedgingViewed(payload.suggestions?.length ?? 0);
        }
      } catch (_error) {
        if (active) {
          setHedging([]);
        }
      }
    };
    void fetchHedging();
    return () => {
      active = false;
    };
  }, []);

  const hasUnsavedChanges = draftText !== lastSavedDraft.current;

  useEffect(() => {
    if (attemptId || attempt) return;
    let cancelled = false;
    const startAttempt = async () => {
      try {
        const response = await fetch('/api/writing/attempts/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ promptId: prompt.id, taskType: prompt.taskType }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error((payload as { error?: string })?.error ?? 'Unable to start attempt');
        }
        const payload = (await response.json()) as { attemptId: string };
        if (!cancelled) {
          setAttemptId(payload.attemptId);
          trackClientAttemptStarted({ attemptId: payload.attemptId, promptId: prompt.id, taskType: prompt.taskType });
          void router.replace(
            {
              pathname: `/writing/${prompt.slug}`,
              query: { attemptId: payload.attemptId },
            },
            undefined,
            { shallow: true },
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to start attempt');
        }
      }
    };
    void startAttempt();
    return () => {
      cancelled = true;
    };
  }, [attempt, attemptId, prompt.id, prompt.slug, prompt.taskType, router]);

  useEffect(() => {
    if (submitState === 'submitting') return;
    const interval = window.setInterval(() => {
      setTimeSpentMs((prev) => prev + 1000);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [submitState]);

  useEffect(() => {
    if (!attemptId || !hasUnsavedChanges) return;
    setSaveState('saving');
    const payload: SaveDraftBody = { attemptId, draftText, wordCount, timeSpentMs };
    const timeout = window.setTimeout(async () => {
      try {
        await sendDraft(payload);
        lastSavedDraft.current = payload.draftText;
        if (isMounted.current) {
          setSaveState('saved');
          setError(null);
          setOfflineQueued(false);
        }
      } catch (err) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          enqueueOfflineDraft(payload);
          setOfflineQueued(true);
          if (isMounted.current) {
            setSaveState('saved');
            setError('Offline — your draft will sync when you reconnect.');
          }
        } else if (isMounted.current) {
          setSaveState('error');
          setError(err instanceof Error ? err.message : 'Unable to save draft');
        }
      }
    }, 6000);

    return () => window.clearTimeout(timeout);
  }, [attemptId, draftText, hasUnsavedChanges, sendDraft, timeSpentMs, wordCount]);

  useEffect(() => {
    if (!attemptId) return;
    void syncOfflineDrafts();
  }, [attemptId, syncOfflineDrafts]);

  useEffect(() => {
    const handler = () => {
      void syncOfflineDrafts();
    };
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, [syncOfflineDrafts]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  const handleDraftChange = useCallback(
    (value: string) => {
      setDraftText(value);
      setWordCount(countWords(value));
      setSaveState('saving');
    },
    [],
  );

  const handleApplySuggestion = useCallback(
    (suggestion: LiveSuggestion) => {
      setDraftText((current) => {
        const paragraphs = splitParagraphs(current);
        if (suggestion.paragraphIndex >= paragraphs.length) return current;
        const index = suggestion.paragraphIndex;
        let paragraph = paragraphs[index];
        if (suggestion.replacement && suggestion.original) {
          const escaped = suggestion.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escaped);
          paragraph = paragraph.replace(regex, suggestion.replacement ?? suggestion.original);
        } else if (suggestion.example) {
          paragraph = `${suggestion.example} ${paragraph}`.trim();
        } else {
          paragraph = `${suggestion.suggestion} ${paragraph}`.trim();
        }
        const updated = [...paragraphs];
        updated[index] = paragraph;
        const nextText = updated.join('\n\n');
        setWordCount(countWords(nextText));
        setSaveState('saving');
        return nextText;
      });
    },
    [],
  );

  const handleInsertParaphrase = useCallback(
    (sentence: string) => {
      const next = `${draftText.trim()} ${sentence}`.trim();
      handleDraftChange(next);
    },
    [draftText, handleDraftChange],
  );

  const handleEvidenceInsert = useCallback(
    (evidenceText: string) => {
      const trimmed = evidenceText.trim();
      if (!trimmed) return;
      setDraftText((current) => {
        const next = current.trim().length > 0 ? `${current.trim()}\n\n${trimmed}` : trimmed;
        setWordCount(countWords(next));
        setSaveState('saving');
        return next;
      });
    },
    [],
  );

  const handleHandwritingInsert = useCallback(
    ({ text: handwritingText, legibility }: { text: string; legibility: number }) => {
      const trimmed = handwritingText.trim();
      if (!trimmed) return;
      setDraftText((current) => {
        const next = current.trim().length > 0 ? `${current.trim()}\n\n${trimmed}` : trimmed;
        setWordCount(countWords(next));
        setSaveState('saving');
        return next;
      });
      trackClientHandwritingUploaded(legibility);
    },
    [],
  );

  const handleBulkPaste = useCallback(() => {
    setCopyAlert('Large paste detected. Summarise or paraphrase to keep originality high.');
    setBulkPasteDetected(true);
  }, []);

  const handleSubmit = async () => {
    if (!attemptId) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('Reconnect to submit for scoring. Your latest draft is stored offline.');
      return;
    }

    setSubmitState('submitting');
    setError(null);
    try {
      await syncOfflineDrafts();

      if (hasUnsavedChanges) {
        const payload: SaveDraftBody = { attemptId, draftText, wordCount, timeSpentMs };
        await sendDraft(payload);
        lastSavedDraft.current = payload.draftText;
        setOfflineQueued(false);
      }

      const response = await fetch('/api/writing/attempts/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { error?: string })?.error ?? 'Unable to submit');
      }
      trackClientAttemptSubmitted({ attemptId });
      setStatus('submitted');
      window.setTimeout(() => {
        void router.push(`/writing/review/${attemptId}`);
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit attempt');
    } finally {
      if (isMounted.current) {
        setSubmitState('idle');
      }
    }
  };

  const outline = prompt.outline;
  const helperText = offlineQueued
    ? 'Offline — pending saves will sync when you reconnect.'
    : 'Autosave every ~6s while typing.';

  return (
    <>
      <Head>
        <title>{prompt.topic} • Writing studio</title>
      </Head>
      <Container className="py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="soft" tone="info" size="sm" className="capitalize">
                {prompt.taskType === 'task1' ? 'Task 1' : 'Task 2'}
              </Badge>
              <Badge variant="soft" tone="default" size="sm">
                Difficulty {prompt.difficulty}
              </Badge>
            </div>
            <h1 className="text-3xl font-semibold text-foreground md:text-4xl">{prompt.topic}</h1>
            <p className="text-sm text-muted-foreground">
              Autosave keeps your draft safe. Submit when you are ready for scoring and feedback.
            </p>
            {error && <p className="text-sm text-danger">{error}</p>}
            {copyAlert && (
              <Alert variant="warning" className="mt-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>{copyAlert}</span>
                  <Button size="xs" variant="ghost" onClick={() => setCopyAlert(null)}>
                    Dismiss
                  </Button>
                </div>
              </Alert>
            )}
          </div>

          <WritingEditor
            value={draftText}
            onChange={handleDraftChange}
            wordCount={wordCount}
            elapsedMs={timeSpentMs}
            taskType={prompt.taskType}
            saveState={saveState}
            status={status}
            submitting={submitState === 'submitting'}
            disableSubmit={!attemptId || draftText.trim().length === 0 || status === 'submitted'}
            onSubmit={handleSubmit}
            helper={helperText}
            onBulkPaste={handleBulkPaste}
          />

          <LanguageToolsDock
            text={draftText}
            timeSpentMs={timeSpentMs}
            onApplySuggestion={handleApplySuggestion}
            onInsertParaphrase={handleInsertParaphrase}
            evidence={isTask2 ? evidence : undefined}
            onInsertEvidence={isTask2 ? handleEvidenceInsert : undefined}
            onRefreshEvidence={isTask2 ? loadEvidence : undefined}
            evidenceLoading={evidenceLoading}
            hedging={hedging}
            attemptId={attemptId}
            onInsertHandwriting={handleHandwritingInsert}
            disabled={status !== 'draft'}
          />

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card className="card-surface space-y-4 p-6">
              <h2 className="text-xl font-semibold text-foreground">Prompt outline</h2>
              {outline.length > 0 ? (
                <ol className="list-decimal space-y-3 pl-6 text-sm text-muted-foreground">
                  {outline.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No outline hints for this prompt yet.</p>
              )}
            </Card>
            {prompt.band9Sample && (
              <Card className="card-surface space-y-3 p-6">
                <h2 className="text-xl font-semibold text-foreground">Band 9 sample excerpt</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{prompt.band9Sample}</p>
              </Card>
            )}
          </div>
        </div>
      </Container>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<PromptPageProps> = withPlanPage('free')(async (ctx) => {
  const { slug } = ctx.params as { slug: string };
  const attemptId = typeof ctx.query.attemptId === 'string' ? ctx.query.attemptId : null;

  const supabase = getServerClient(ctx.req as any, ctx.res as any);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: '/welcome?from=/writing',
        permanent: false,
      },
    };
  }

  const { data: promptRow, error: promptError } = await supabase
    .from('writing_prompts')
    .select('id, slug, topic, task_type, difficulty, band9_sample, outline_json, created_at')
    .eq('slug', slug)
    .maybeSingle();

  if (promptError || !promptRow) {
    return {
      notFound: true,
    };
  }

  let attempt: PromptPageProps['attempt'] = null;
  if (attemptId) {
    const { data: attemptRow } = await supabase
      .from('writing_attempts')
      .select('id, draft_text, word_count, time_spent_ms, status, updated_at')
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (attemptRow) {
      attempt = {
        id: attemptRow.id,
        draftText: attemptRow.draft_text ?? '',
        wordCount: attemptRow.word_count ?? 0,
        timeSpentMs: attemptRow.time_spent_ms ?? 0,
        status: attemptRow.status,
        updatedAt: attemptRow.updated_at,
      };
    }
  }

  const rawOutline = promptRow.outline_json;
  let outlineValue: string[] = [];
  if (Array.isArray(rawOutline)) {
    outlineValue = rawOutline.map((item) => String(item)).filter((item) => item.length > 0);
  } else if (rawOutline && typeof rawOutline === 'object') {
    const maybeItems = (rawOutline as { items?: unknown; steps?: unknown }).items;
    const maybeSteps = (rawOutline as { steps?: unknown }).steps;
    if (Array.isArray(maybeItems)) {
      outlineValue = maybeItems.map((item) => String(item)).filter((item) => item.length > 0);
    } else if (Array.isArray(maybeSteps)) {
      outlineValue = maybeSteps.map((item) => String(item)).filter((item) => item.length > 0);
    } else {
      outlineValue = Object.values(rawOutline as Record<string, unknown>)
        .map((item) => String(item))
        .filter((item) => item.length > 0);
    }
  }

  return {
    props: {
      prompt: {
        id: promptRow.id,
        slug: promptRow.slug,
        topic: promptRow.topic,
        taskType: promptRow.task_type as WritingTaskType,
        difficulty: promptRow.difficulty ?? 2,
        band9Sample: promptRow.band9_sample ?? null,
        outline: outlineValue.filter(Boolean),
        createdAt: promptRow.created_at,
      },
      attempt,
    },
  };
});

export default WritingPromptPage;
