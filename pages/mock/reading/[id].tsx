import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import {
  clearMockAttemptId,
  clearMockDraft,
  ensureMockAttemptId,
  fetchMockCheckpoint,
  loadMockDraft,
  saveMockCheckpoint,
  saveMockDraft,
} from '@/lib/mock/state';
import { useDebouncedCallback } from 'use-debounce';
import { ReadingPassage } from '@/components/exam/ReadingPassage';
import { track } from '@/lib/analytics/track';

type QType = 'tfng' | 'yynn' | 'heading' | 'match' | 'mcq' | 'gap';
type Q = { id: string; type: QType; prompt?: string; options?: string[]; answer: string };
type Passage = { id: string; title: string; text: string; questions: Q[] };
type ReadingPaper = { id: string; title: string; durationSec: number; passages: Passage[] };

type AnswerMap = Record<string, string>;
type ReadingNote = {
  id: string;
  passageId: string;
  start: number;
  end: number;
  color: string;
  noteText?: string | null;
};
type SelectionInput = { start: number; end: number; text: string; noteText?: string };
type DraftState = {
  answers: AnswerMap;
  passageIdx: number;
  timeLeft?: number;
  notes?: ReadingNote[];
};

const sampleReading: ReadingPaper = {
  id: 'sample-001',
  title: 'Reading Sample 001',
  durationSec: 3600,
  passages: [
    { id: 'P1', title: 'The Honeybee', text: 'Bees are fascinating…', questions: [
      { id: 'q1', type: 'tfng', prompt: 'Bees can see UV light.', answer: 'True' },
      { id: 'q2', type: 'yynn', prompt: 'Honey is spicy.', answer: 'No' },
      { id: 'q3', type: 'heading', prompt: 'Choose paragraph heading', options: ['Origins','Vision','Diet'], answer: 'Vision' },
    ]},
    { id: 'P2', title: 'Ancient Roads', text: 'Roads enabled trade…', questions: [
      { id: 'q4', type: 'match', prompt: 'Match A with B', options: ['Roman','Silk','Inca'], answer: 'Roman' },
      { id: 'q5', type: 'mcq', prompt: 'Pick one', options: ['A','B','C'], answer: 'C' },
    ]},
  ],
};

const loadPaper = async (id: string): Promise<ReadingPaper> => {
  try { const mod = await import(`@/data/reading/${id}.json`); return mod.default as ReadingPaper; } catch { return sampleReading; }
};

const Shell: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, right, children }) => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-h3 font-semibold">{title}</h1>
        <div className="flex items-center gap-3">{right}</div>
      </header>
      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        {children}
      </div>
    </div>
  </div>
);

export default function ReadingMockPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [paper, setPaper] = useState<ReadingPaper | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [passageIdx, setPassageIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [notes, setNotes] = useState<ReadingNote[]>([]);
  const attemptRef = useRef<string>('');
  const [attemptReady, setAttemptReady] = useState(false);
  const [checkpointHydrated, setCheckpointHydrated] = useState(false);
  const latestRef = useRef<{ answers: AnswerMap; passageIdx: number; timeLeft: number; notes: ReadingNote[] }>({
    answers: {},
    passageIdx: 0,
    timeLeft: 0,
    notes: [],
  });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteEditorValue, setNoteEditorValue] = useState('');
  const noteRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [notesLoaded, setNotesLoaded] = useState(true);
  const DEFAULT_NOTE_COLOR = 'warning';

  useEffect(() => {
    if (!id) return;
    const attempt = ensureMockAttemptId('reading', id);
    attemptRef.current = attempt;
    setAttemptReady(true);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const p = await loadPaper(id);
      setPaper(p);
      const draft = loadMockDraft<DraftState>('reading', id);
      if (draft?.data) {
        if (draft.data.answers) setAnswers(draft.data.answers);
        if (typeof draft.data.passageIdx === 'number') setPassageIdx(draft.data.passageIdx);
        if (typeof draft.data.timeLeft === 'number') {
          setTimeLeft(Math.max(0, Math.min(p.durationSec, Math.round(draft.data.timeLeft))));
        } else {
          setTimeLeft(p.durationSec);
        }
        if (Array.isArray(draft.data.notes)) setNotes(draft.data.notes);
      } else {
        setTimeLeft(p.durationSec);
        saveMockDraft('reading', id, { answers: {}, passageIdx: 0, timeLeft: p.durationSec, notes: [] });
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!paper || !attemptReady) return;
    let cancelled = false;

    (async () => {
      const checkpoint = await fetchMockCheckpoint({ attemptId: attemptRef.current, section: 'reading' });
      if (cancelled) return;
      if (checkpoint && checkpoint.mockId === paper.id) {
        const payload = (checkpoint.payload || {}) as {
          answers?: AnswerMap;
          passageIdx?: number;
          timeLeft?: number;
          notes?: ReadingNote[];
        };
        if (payload.answers) setAnswers(payload.answers);
        if (typeof payload.passageIdx === 'number') setPassageIdx(payload.passageIdx);
        if (typeof payload.timeLeft === 'number') {
          setTimeLeft(Math.max(0, Math.min(paper.durationSec, Math.round(payload.timeLeft))));
        } else {
          const duration = typeof checkpoint.duration === 'number' ? checkpoint.duration : paper.durationSec;
          const remaining = Math.max(0, duration - checkpoint.elapsed);
          setTimeLeft(Math.max(0, Math.min(paper.durationSec, remaining)));
        }
        if (Array.isArray(payload.notes)) setNotes(payload.notes);
      }
      setCheckpointHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [paper, attemptReady]);

  useEffect(() => {
    if (!paper) return;
    const t = setInterval(() => setTimeLeft((x) => (x > 0 ? x - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [paper]);

  const debouncedLocalDraft = useDebouncedCallback(
    (payload: DraftState) => {
      if (!id) return;
      saveMockDraft('reading', id, payload);
    },
    500,
    { maxWait: 3000 }
  );

  useEffect(() => {
    latestRef.current = { answers, passageIdx, timeLeft, notes };
  }, [answers, passageIdx, timeLeft, notes]);

  useEffect(() => {
    if (!id) return;
    debouncedLocalDraft({ answers, passageIdx, timeLeft, notes });
    return () => {
      debouncedLocalDraft.flush();
    };
  }, [id, answers, passageIdx, timeLeft, notes, debouncedLocalDraft]);

  const persistCheckpoint = useCallback(
    (opts?: { completed?: boolean }) => {
      if (!paper || !attemptReady || !checkpointHydrated || !attemptRef.current) return;
      const state = latestRef.current;
      const elapsed = Math.max(0, Math.min(paper.durationSec, paper.durationSec - state.timeLeft));
      void saveMockCheckpoint({
        attemptId: attemptRef.current,
        section: 'reading',
        mockId: paper.id,
        payload: {
          paperId: paper.id,
          answers: state.answers,
          passageIdx: state.passageIdx,
          timeLeft: state.timeLeft,
          notes: state.notes,
        },
        elapsed,
        duration: paper.durationSec,
        completed: opts?.completed,
      });
    },
    [paper, attemptReady, checkpointHydrated]
  );

  useEffect(() => {
    if (!paper || !attemptReady || !checkpointHydrated) return;
    const handler = () => {
      debouncedLocalDraft.flush();
      persistCheckpoint();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [paper, attemptReady, checkpointHydrated, persistCheckpoint, debouncedLocalDraft]);

  useEffect(() => {
    if (!paper || !attemptReady || !checkpointHydrated) return;
    const handle = setTimeout(() => persistCheckpoint(), 1000);
    return () => clearTimeout(handle);
  }, [answers, passageIdx, paper, attemptReady, checkpointHydrated, persistCheckpoint]);

  useEffect(() => {
    if (!paper || !attemptReady || !checkpointHydrated) return;
    const interval = setInterval(() => persistCheckpoint(), 15000);
    return () => clearInterval(interval);
  }, [paper, attemptReady, checkpointHydrated, persistCheckpoint]);

  useEffect(() => {
    if (!attemptReady || !checkpointHydrated) return;
    const attemptId = attemptRef.current;
    if (!attemptId) {
      setNotesLoaded(true);
      return;
    }

    setNotesLoaded(false);

    let cancelled = false;
    const controller = new AbortController();

    const loadNotes = async () => {
      try {
        const params = new URLSearchParams({ attemptId });
        const res = await fetch(`/api/mock/reading/notes?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as {
          ok: boolean;
          notes?: Array<{ id: string; passageId: string; ranges: Array<{ start: number; end: number; color?: string }>; noteText?: string | null }>;
        };
        if (!cancelled && data?.ok && Array.isArray(data.notes)) {
          const mapped = data.notes
            .map((item) => mapServerNote(item))
            .filter((item): item is ReadingNote => Boolean(item));
          setNotes((prev) => mergeNotes(prev, mapped));
        }
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return;
      } finally {
        if (!cancelled) setNotesLoaded(true);
      }
    };

    void loadNotes();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [attemptReady, checkpointHydrated]);
  const current = useMemo(() => (paper ? paper.passages[passageIdx] : undefined), [paper, passageIdx]);
  const currentPassageId = current?.id;
  const passageNotes = useMemo(() => {
    if (!currentPassageId) return [] as ReadingNote[];
    return notes.filter((note) => note.passageId === currentPassageId).sort((a, b) => a.start - b.start);
  }, [notes, currentPassageId]);

  useEffect(() => {
    setEditingNoteId(null);
    setNoteEditorValue('');
  }, [current?.id]);

  const createAnnotation = useCallback(
    async (payload: SelectionInput) => {
      if (!current) return;
      const textLength = current.text.length;
      const start = Math.max(0, Math.min(payload.start, textLength));
      const end = Math.max(start, Math.min(payload.end, textLength));
      if (end <= start) return;

      const existing = latestRef.current.notes.filter((note) => note.passageId === current.id);
      const overlaps = existing.some((note) => rangesOverlap(note.start, note.end, start, end));
      if (overlaps) {
        if (typeof window !== 'undefined') {
          window.alert('Selection overlaps an existing highlight. Remove it first to re-highlight.');
        }
        return;
      }

      const localId = `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      const provisional: ReadingNote = {
        id: localId,
        passageId: current.id,
        start,
        end,
        color: DEFAULT_NOTE_COLOR,
        noteText: payload.noteText ?? null,
      };

      setNotes((prev) => mergeNotes(prev, [provisional]));

      if (payload.noteText && payload.noteText.trim().length > 0) {
        track('reading.note.add', {
          passageId: current.id,
          length: Math.min(1000, payload.noteText.length),
        });
        setEditingNoteId(localId);
        setNoteEditorValue(payload.noteText);
      } else {
        setEditingNoteId(null);
        setNoteEditorValue('');
      }

      track('reading.highlight.add', {
        passageId: current.id,
        withNote: Boolean(payload.noteText && payload.noteText.trim().length > 0),
      });

      const attemptId = attemptRef.current;
      if (!attemptId) return;

      try {
        const response = await fetch('/api/mock/reading/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId,
            passageId: current.id,
            ranges: [{ start, end, color: DEFAULT_NOTE_COLOR }],
            noteText: payload.noteText ?? null,
          }),
        });

        if (!response.ok) throw new Error(`Failed with status ${response.status}`);

        const result = (await response.json()) as {
          ok: boolean;
          note?: { id?: string; passageId?: string; ranges?: Array<{ start?: number; end?: number; color?: string }>; noteText?: string | null };
        };

        if (result.ok && result.note) {
          const mapped = mapServerNote(result.note);
          if (mapped) {
            setNotes((prev) => {
              const withoutTemp = prev.filter((note) => note.id !== localId);
              return mergeNotes(withoutTemp, [mapped]);
            });
            if (payload.noteText && payload.noteText.trim().length > 0) {
              setEditingNoteId(mapped.id);
              setNoteEditorValue(mapped.noteText ?? payload.noteText);
            }
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console -- surfaced in development for debugging persistence issues
        console.error('Failed to persist reading note', error);
      }
    },
    [current, DEFAULT_NOTE_COLOR]
  );

  const handleSelectionHighlight = useCallback(
    (payload: SelectionInput) => {
      void createAnnotation({ ...payload, noteText: undefined });
    },
    [createAnnotation]
  );

  const handleSelectionNote = useCallback(
    (payload: SelectionInput) => {
      void createAnnotation(payload);
    },
    [createAnnotation]
  );

  const handleHighlightFocus = useCallback(
    (noteId: string) => {
      setEditingNoteId(noteId);
      const target = notes.find((note) => note.id === noteId);
      setNoteEditorValue(target?.noteText ?? '');
      const node = noteRefs.current[noteId];
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof window !== 'undefined') {
          window.setTimeout(() => {
            node.focus({ preventScroll: true });
          }, 180);
        }
      }
    },
    [notes]
  );

  const handleNoteSave = useCallback(
    async (noteId: string) => {
      const trimmed = noteEditorValue.trim();
      const target = notes.find((note) => note.id === noteId);
      const previous = target?.noteText ?? null;
      const previousTrimmed = (previous ?? '').trim();
      const payloadNote = trimmed.length > 0 ? trimmed : null;

      setNotes((prev) =>
        prev.map((note) => (note.id === noteId ? { ...note, noteText: payloadNote } : note))
      );

      setEditingNoteId(null);
      setNoteEditorValue('');

      if (target && trimmed.length > 0 && previousTrimmed.length === 0) {
        track('reading.note.add', {
          passageId: target.passageId,
          length: Math.min(1000, trimmed.length),
        });
      }

      if ((previous ?? null) === payloadNote) {
        return;
      }

      const attemptId = attemptRef.current;
      if (!attemptId) return;

      try {
        const response = await fetch('/api/mock/reading/notes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: noteId, noteText: payloadNote }),
        });
        if (!response.ok) throw new Error(`Failed with status ${response.status}`);
      } catch (error) {
        setNotes((prev) =>
          prev.map((note) => (note.id === noteId ? { ...note, noteText: previous } : note))
        );
        // eslint-disable-next-line no-console -- assists debugging when persistence fails locally
        console.error('Failed to update reading note', error);
      }
    },
    [noteEditorValue, notes]
  );

  const handleRemoveHighlight = useCallback(
    async (noteId: string) => {
      const previousNotes = notes;
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      if (editingNoteId === noteId) {
        setEditingNoteId(null);
        setNoteEditorValue('');
      }

      const attemptId = attemptRef.current;
      if (!attemptId) return;

      try {
        const response = await fetch('/api/mock/reading/notes', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: noteId }),
        });
        if (!response.ok) throw new Error(`Failed with status ${response.status}`);
      } catch (error) {
        setNotes(previousNotes);
        // eslint-disable-next-line no-console -- assists debugging when persistence fails locally
        console.error('Failed to delete reading note', error);
      }
    },
    [notes, editingNoteId]
  );

  const cancelNoteEditing = useCallback(() => {
    setEditingNoteId(null);
    setNoteEditorValue('');
  }, []);

  const submit = async () => {
    if (!paper || !id) return;
    const flatQ = paper.passages.flatMap((p) => p.questions);
    let correct = 0;
    for (const q of flatQ) if (normalize(answers[q.id] || '') === normalize(q.answer)) correct++;
    const percentage = Math.round((correct / flatQ.length) * 100);
    let attemptId = '';
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.id) throw new Error('Not authenticated');
      const payload = { user_id: u.user.id, paper_id: paper.id, answers, score: correct, total: flatQ.length, percentage, submitted_at: new Date().toISOString(), duration_sec: paper.durationSec - timeLeft };
      const { data, error } = await supabase.from('attempts_reading').insert(payload).select('id').single();
      if (error) throw error;
      attemptId = data.id as unknown as string;
    } catch {
      attemptId = `local-${Date.now()}`;
      try { localStorage.setItem(`read:attempt-res:${attemptId}`, JSON.stringify({ paper, answers })); } catch {}
    } finally {
      if (attemptRef.current) {
        void saveMockCheckpoint({
          attemptId: attemptRef.current,
          section: 'reading',
          mockId: paper.id,
          // Include notes for resume flows as a fallback to the dedicated notes table
          // to guard against offline autosave scenarios.
          payload: { paperId: paper.id, answers, passageIdx, timeLeft, notes },
          elapsed: paper.durationSec - timeLeft,
          duration: paper.durationSec,
          completed: true,
        });
        clearMockAttemptId('reading', paper.id);
      }
      clearMockDraft('reading', id);
      router.replace(`/review/reading/${id}?attempt=${attemptId}`);
    }
  };

  if (!paper || !current) return <Shell title="Loading..."><div className="rounded-2xl border border-border p-4">Loading paper…</div></Shell>;

  const palette = paper.passages.flatMap((p) => p.questions.map((q) => q.id));
  const answered = Object.keys(answers).length;
  const percent = Math.round((answered / palette.length) * 100);

  return (
    <Shell
      title={`Reading — ${paper.title}`}
      right={
        <>
          <div className="text-small text-foreground/80">Answered {percent}%</div>
          <div className="rounded-full border border-border px-3 py-1 text-small">⏱ {hhmmss(timeLeft)}</div>
        </>
      }
    >
      {/* Left: passage + questions */}
      <div className="rounded-2xl border border-border p-4 bg-background/50">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-small font-medium">Passage {passageIdx + 1} of {paper.passages.length} — {current.title}</div>
          <div className="flex gap-2">
            <button disabled={passageIdx === 0} onClick={() => setPassageIdx((i) => Math.max(0, i - 1))} className="rounded-lg border border-border px-3 py-1 text-small hover:border-primary">Prev</button>
            <button disabled={passageIdx === paper.passages.length - 1} onClick={() => setPassageIdx((i) => Math.min(paper.passages.length - 1, i + 1))} className="rounded-lg border border-border px-3 py-1 text-small hover:border-primary">Next</button>
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/70 p-4">
          <ReadingPassage
            text={current.text}
            highlights={passageNotes}
            onCreateHighlight={handleSelectionHighlight}
            onCreateNote={handleSelectionNote}
            onHighlightFocus={handleHighlightFocus}
          />
        </div>
        <div className="mt-3 text-caption text-foreground/70">
          Select text in the passage to highlight or add a note. Highlights autosave for this attempt.
        </div>
        <div className="mt-4 grid gap-3">
          {current.questions.map((q) => (
            <div key={q.id} className="rounded-lg border border-border p-3">
              <div className="mb-1 text-small font-medium">{q.prompt || q.id}</div>
              {renderInput(q, answers[q.id] || '', (val) => setAnswers((a) => ({ ...a, [q.id]: val })))}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={submit} className="rounded-xl bg-primary px-4 py-2 font-medium text-background hover:opacity-90">Submit for scoring</button>
        </div>
      </div>

      {/* Right: palette */}
      <aside className="flex h-full flex-col rounded-2xl border border-border bg-background/50 p-4">
        <div>
          <div className="mb-2 text-small font-medium">Question palette</div>
          <div className="grid grid-cols-5 gap-2">
            {palette.map((qid, idx) => (
              <div
                key={qid}
                className={`rounded border py-1 text-center text-caption ${answers[qid] ? 'border-primary text-primary' : 'border-border'}`}
              >
                {idx + 1}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 border-t border-border/60 pt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-small font-medium">Highlights & notes</div>
            {!notesLoaded && <span className="text-caption text-foreground/60">Syncing…</span>}
          </div>
          {passageNotes.length === 0 ? (
            <p className="text-caption text-foreground/60">
              Select text in the passage to leave highlights or notes. They&apos;ll appear here for quick access.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {passageNotes.map((note) => {
                const isEditing = editingNoteId === note.id;
                const hasNote = Boolean(note.noteText && note.noteText.trim().length > 0);
                const excerpt = current ? excerptForNote(note, current.text) : '';
                return (
                  <div
                    key={note.id}
                    ref={(node) => {
                      if (node) {
                        noteRefs.current[note.id] = node;
                      } else {
                        delete noteRefs.current[note.id];
                      }
                    }}
                    tabIndex={-1}
                    className={`rounded-xl border p-3 outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                      isEditing ? 'border-primary shadow-sm' : 'border-border'
                    }`}
                  >
                    <div className="text-caption font-medium uppercase text-foreground/60">Highlight</div>
                    <p className="mt-1 whitespace-pre-wrap text-small text-foreground/90">{excerpt}</p>
                    {isEditing ? (
                      <div className="mt-3 space-y-2">
                        <label className="block text-caption font-medium text-foreground/70" htmlFor={`note-edit-${note.id}`}>
                          Note
                        </label>
                        <textarea
                          id={`note-edit-${note.id}`}
                          value={noteEditorValue}
                          onChange={(event) => setNoteEditorValue(event.target.value)}
                          rows={3}
                          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-small focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          placeholder="Add your note"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleNoteSave(note.id)}
                            className="rounded-full bg-primary px-3 py-1 text-small font-medium text-background hover:opacity-90"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelNoteEditing}
                            className="rounded-full border border-border px-3 py-1 text-small text-foreground/70 hover:border-foreground/50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <div className="whitespace-pre-wrap text-small text-foreground/80">
                          {hasNote ? note.noteText : <span className="text-foreground/60">No note yet.</span>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleHighlightFocus(note.id)}
                            className="rounded-full border border-border px-3 py-1 text-small text-foreground transition hover:border-primary hover:text-primary"
                          >
                            {hasNote ? 'Edit note' : 'Add note'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveHighlight(note.id)}
                            className="rounded-full border border-border px-3 py-1 text-small text-danger transition hover:border-danger hover:bg-danger/10"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-auto pt-4">
          <Link href="/reading" className="text-small underline underline-offset-4">
            Change test
          </Link>
        </div>
      </aside>
    </Shell>
  );
}

function renderInput(q: Q, value: string, onChange: (v: string) => void) {
  if (q.type === 'tfng') {
    const opts = ['True', 'False', 'Not Given'];
    return <Options options={opts} value={value} onPick={onChange} />;
  }
  if (q.type === 'yynn') {
    const opts = ['Yes', 'No', 'Not Given'];
    return <Options options={opts} value={value} onPick={onChange} />;
  }
  if (q.type === 'heading' || q.type === 'match' || q.type === 'mcq') {
    return <Options options={q.options || []} value={value} onPick={onChange} />;
  }
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" placeholder="Type your answer" />
  );
}
const Options: React.FC<{ options: string[]; value: string; onPick: (v: string) => void }> = ({ options, value, onPick }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => (
      <button key={opt} onClick={() => onPick(opt)} type="button" className={`rounded-lg border px-3 py-1 text-small hover:border-primary ${value === opt ? 'border-primary' : 'border-border'}`}>{opt}</button>
    ))}
  </div>
);
const hhmmss = (sec: number) => `${Math.floor(sec/60).toString().padStart(2,'0')}:${Math.floor(sec%60).toString().padStart(2,'0')}`;
const normalize = (s: string) => s.trim().toLowerCase();

function mapServerNote(row: {
  id?: string;
  passageId?: string;
  ranges?: Array<{ start?: number; end?: number; color?: string }>;
  noteText?: string | null;
}): ReadingNote | null {
  const id = typeof row?.id === 'string' ? row.id : null;
  const passageId = typeof row?.passageId === 'string' ? row.passageId : null;
  if (!id || !passageId) return null;
  const ranges = Array.isArray(row?.ranges) ? row.ranges : [];
  if (ranges.length === 0) return null;
  const primary = ranges[0];
  const start = typeof primary?.start === 'number' ? Math.max(0, Math.round(primary.start)) : null;
  const end = typeof primary?.end === 'number' ? Math.max(0, Math.round(primary.end)) : null;
  if (start === null || end === null) return null;
  const color = typeof primary?.color === 'string' && primary.color ? primary.color : 'warning';
  return {
    id,
    passageId,
    start,
    end: Math.max(start, end),
    color,
    noteText: typeof row?.noteText === 'string' ? row.noteText : null,
  };
}

function mergeNotes(existing: ReadingNote[], incoming: ReadingNote[]): ReadingNote[] {
  const map = new Map<string, ReadingNote>();
  for (const note of existing) {
    map.set(note.id, note);
  }
  for (const note of incoming) {
    map.set(note.id, note);
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.passageId === b.passageId) return a.start - b.start;
    return a.passageId.localeCompare(b.passageId);
  });
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

function excerptForNote(note: ReadingNote, text: string): string {
  if (!text) return '';
  const length = text.length;
  const start = Math.max(0, Math.min(note.start, length));
  const end = Math.max(start, Math.min(note.end, length));
  const raw = text.slice(start, end).trim();
  if (!raw) {
    const fallback = text.slice(start, Math.min(start + 160, length)).trim();
    return fallback.length > 0 ? fallback : text.slice(0, Math.min(160, length)).trim();
  }
  if (raw.length <= 160) return raw;
  return `${raw.slice(0, 157)}…`;
}
