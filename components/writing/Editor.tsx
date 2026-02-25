import React from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card, CardContent, CardHeader } from '@/components/design-system/Card';
import { Modal } from '@/components/design-system/Modal';
import { EditorStatusBar } from '@/components/writing/EditorStatusBar';
import {
  clearDraft,
  countWords,
  loadDraft,
  markDraftSynced,
  saveDraft,
  shouldSyncServer,
  type WritingDraftRecord,
} from '@/lib/storage/drafts';

export interface WritingTask {
  title: string;
  prompt: string;
  minWords: number;
  maxTimeMinutes?: number;
  hints?: string[];
  outline?: string[];
  assessment?: {
    criteria: string[];
  };
  type?: string;
}

export interface WritingPaper {
  id: string;
  task1: WritingTask;
  task2: WritingTask;
}

type Status = 'idle' | 'saving' | 'saved';

const STORAGE_PREFIX = 'writing:';

const createAttemptId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatSavedText = (timestamp: number | null) => {
  if (!timestamp) return 'Not saved yet';
  const delta = Date.now() - timestamp;
  if (delta < 15_000) return 'Saved just now';
  if (delta < 60_000) return `Saved ${Math.round(delta / 1000)}s ago`;
  if (delta < 3_600_000) return `Saved ${Math.round(delta / 60000)}m ago`;
  return `Saved at ${new Date(timestamp).toLocaleTimeString()}`;
};

const isBrowser = typeof window !== 'undefined';

export interface WritingEditorProps {
  paper: WritingPaper;
}

export const WritingEditor: React.FC<WritingEditorProps> = ({ paper }) => {
  const storageKey = React.useMemo(() => `${STORAGE_PREFIX}${paper.id}`, [paper.id]);
  const pendingDraftRef = React.useRef<WritingDraftRecord | null>(null);
  const latestStorageKeyRef = React.useRef(storageKey);

  const [task1, setTask1] = React.useState('');
  const [task2, setTask2] = React.useState('');
  const [status, setStatus] = React.useState<Status>('idle');
  const [lastSavedAt, setLastSavedAt] = React.useState<number | null>(null);
  const [restoreOpen, setRestoreOpen] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);

  const attemptIdRef = React.useRef<string>(createAttemptId());
  const startedAtRef = React.useRef<number>(Date.now());
  const syncedAtRef = React.useRef<number | undefined>(undefined);

  const wordCount1 = React.useMemo(() => countWords(task1), [task1]);
  const wordCount2 = React.useMemo(() => countWords(task2), [task2]);

  const persistDraft = React.useCallback(
    (timestamp: number) => {
      const draft: WritingDraftRecord = {
        attemptId: attemptIdRef.current,
        startedAt: startedAtRef.current,
        updatedAt: timestamp,
        syncedAt: syncedAtRef.current,
        content: {
          task1,
          task2,
          task1WordCount: wordCount1,
          task2WordCount: wordCount2,
        },
      };
      const key = latestStorageKeyRef.current;
      if (key) {
        saveDraft(key, draft);
      }
      setLastSavedAt(timestamp);
      return draft;
    },
    [task1, task2, wordCount1, wordCount2],
  );

  const syncToServer = React.useCallback(
    async (draft: WritingDraftRecord) => {
      if (!shouldSyncServer(draft, Date.now())) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      try {
        const res = await fetch('/api/writing/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paperId: paper.id,
            attemptId: draft.attemptId,
            updatedAt: draft.updatedAt,
            startedAt: draft.startedAt,
            content: draft.content,
          }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { ok?: boolean };
        if (json?.ok) {
          syncedAtRef.current = draft.updatedAt;
          const next = markDraftSynced(draft, draft.updatedAt);
          saveDraft(storageKey, next);
        }
      } catch {
        // Ignore server sync failures
      }
    },
    [paper.id, storageKey],
  );

  const debouncedSave = useDebouncedCallback(() => {
    const now = Date.now();
    const draft = persistDraft(now);
    setStatus('saved');
    void syncToServer(draft);
  }, 8000);

  const debouncedSaveRef = React.useRef(debouncedSave);

  React.useEffect(() => {
    debouncedSaveRef.current = debouncedSave;
  }, [debouncedSave]);

  React.useEffect(() => {
    if (!isBrowser) return;

    debouncedSaveRef.current.cancel();
    pendingDraftRef.current = null;
    setRestoreOpen(false);
    setInitialized(false);
    setStatus('idle');
    setTask1('');
    setTask2('');
    setLastSavedAt(null);
    attemptIdRef.current = createAttemptId();
    startedAtRef.current = Date.now();
    syncedAtRef.current = undefined;
    latestStorageKeyRef.current = storageKey;

    const existing = loadDraft(storageKey);
    if (existing && (existing.content.task1 || existing.content.task2)) {
      pendingDraftRef.current = existing;
      setLastSavedAt(existing.updatedAt);
      setStatus('saved');
      setRestoreOpen(true);
    } else {
      setInitialized(true);
    }

    return () => {
      debouncedSaveRef.current.cancel();
    };
  }, [paper.id, storageKey]);

  React.useEffect(() => {
    if (!initialized) return;
    setStatus('saving');
    debouncedSave();
    return () => {
      debouncedSave.cancel();
    };
  }, [task1, task2, debouncedSave, initialized]);

  React.useEffect(() => () => {
    debouncedSave.flush();
  }, [debouncedSave]);

  const persistNow = React.useCallback(() => {
    if (!initialized) return;
    debouncedSave.cancel();
    const now = Date.now();
    const draft = persistDraft(now);
    setStatus('saved');
    void syncToServer(draft);
  }, [debouncedSave, initialized, persistDraft, syncToServer]);

  React.useEffect(() => {
    if (!isBrowser || !initialized) return;
    const handleBeforeUnload = () => {
      persistNow();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [initialized, persistNow]);

  const handleRestore = React.useCallback(() => {
    const draft = pendingDraftRef.current;
    if (draft) {
      setTask1(draft.content.task1);
      setTask2(draft.content.task2);
      setLastSavedAt(draft.updatedAt);
      attemptIdRef.current = draft.attemptId;
      startedAtRef.current = draft.startedAt;
      syncedAtRef.current = draft.syncedAt;
    }
    pendingDraftRef.current = null;
    setRestoreOpen(false);
    setInitialized(true);
    setStatus(draft ? 'saved' : 'idle');
  }, []);

  const handleDiscard = React.useCallback(() => {
    pendingDraftRef.current = null;
    clearDraft(storageKey);
    setTask1('');
    setTask2('');
    setLastSavedAt(null);
    attemptIdRef.current = createAttemptId();
    startedAtRef.current = Date.now();
    syncedAtRef.current = undefined;
    setRestoreOpen(false);
    setInitialized(true);
    setStatus('idle');
  }, [storageKey]);

  const handleClearAll = React.useCallback(() => {
    if (!isBrowser) return;
    const confirmClear = window.confirm('Clear this draft? Your unsaved writing will be lost.');
    if (!confirmClear) return;
    clearDraft(storageKey);
    setTask1('');
    setTask2('');
    setLastSavedAt(null);
    attemptIdRef.current = createAttemptId();
    startedAtRef.current = Date.now();
    syncedAtRef.current = undefined;
    setStatus('idle');
  }, [storageKey]);

  return (
    <div className="grid gap-6">
      <Modal open={restoreOpen} onClose={handleRestore} title="Resume draft?" size="sm">
        <p className="text-body text-muted-foreground">
          We found a saved draft from your last session. Would you like to continue where you left off?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={handleDiscard}>
            Start fresh
          </Button>
          <Button variant="primary" onClick={handleRestore}>
            Restore
          </Button>
        </div>
      </Modal>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3 font-semibold">Task 1</h2>
          <p className="text-small text-muted-foreground">{paper.task1.title}</p>
        </div>
        <Badge variant={status === 'saving' ? 'info' : 'success'} size="sm">
          {status === 'saving' ? 'Saving…' : formatSavedText(lastSavedAt)}
        </Badge>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-small font-medium text-muted-foreground">Prompt</span>
            <p className="text-body leading-relaxed">{paper.task1.prompt}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-caption text-muted-foreground">
            <span>Minimum {paper.task1.minWords} words</span>
            {paper.task1.maxTimeMinutes ? <span>Suggested time: {paper.task1.maxTimeMinutes} minutes</span> : null}
            {paper.task1.type ? <span>Type: {paper.task1.type}</span> : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {paper.task1.hints && paper.task1.hints.length > 0 ? (
            <div className="rounded-ds-xl border border-border/70 bg-muted/30 p-4">
              <p className="text-small font-medium text-muted-foreground">Hints</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-small text-muted-foreground/90">
                {paper.task1.hints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <label className="grid gap-2">
            <span className="text-small font-medium text-muted-foreground">Your response</span>
            <textarea
              className="min-h-[180px] w-full rounded-ds-xl border border-border bg-background p-4 text-body leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Summarise the key trends…"
              value={task1}
              onChange={(event) => setTask1(event.target.value)}
              onBlur={persistNow}
            />
          </label>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3 font-semibold">Task 2</h2>
          <p className="text-small text-muted-foreground">{paper.task2.title}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-small font-medium text-muted-foreground">Prompt</span>
            <p className="text-body leading-relaxed">{paper.task2.prompt}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-caption text-muted-foreground">
            <span>Minimum {paper.task2.minWords} words</span>
            {paper.task2.maxTimeMinutes ? <span>Suggested time: {paper.task2.maxTimeMinutes} minutes</span> : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {paper.task2.outline && paper.task2.outline.length > 0 ? (
            <div className="rounded-ds-xl border border-border/70 bg-muted/30 p-4">
              <p className="text-small font-medium text-muted-foreground">Suggested outline</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-small text-muted-foreground/90">
                {paper.task2.outline.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <label className="grid gap-2">
            <span className="text-small font-medium text-muted-foreground">Your essay</span>
            <textarea
              className="min-h-[280px] w-full rounded-ds-xl border border-border bg-background p-4 text-body leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Plan, write, and review your essay…"
              value={task2}
              onChange={(event) => setTask2(event.target.value)}
              onBlur={persistNow}
            />
          </label>
        </CardContent>
      </Card>

      <EditorStatusBar
        task1Count={wordCount1}
        task2Count={wordCount2}
        minTask1={paper.task1.minWords}
        minTask2={paper.task2.minWords}
        defaultTimerMinutes={paper.task2.maxTimeMinutes ?? 40}
      />

      <div className="flex justify-end">
        <Button variant="secondary" onClick={handleClearAll}>
          Clear draft
        </Button>
      </div>
    </div>
  );
};

export default WritingEditor;
