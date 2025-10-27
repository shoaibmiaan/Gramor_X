// pages/listening/[slug].tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import type { AutosaveSession } from '@/lib/autosave';
import { createAutosaveSession } from '@/lib/autosave';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';
import { Input } from '@/components/design-system/Input';
import FocusGuard from '@/components/exam/FocusGuard';
import { Timer } from '@/components/design-system/Timer';
import { SaveItemButton } from '@/components/SaveItemButton';
import AudioSectionsPlayer from '@/components/listening/AudioSectionsPlayer';
import Transcript from '@/components/listening/Transcript';

type MCQ = {
  id: string;
  qNo: number;
  type: 'mcq';
  prompt: string;
  options: string[];
  answer: string;
};
type GAP = {
  id: string;
  qNo: number;
  type: 'gap';
  prompt: string;
  answer: string;
};
type Question = MCQ | GAP;

type Section = {
  orderNo: number;
  startMs: number;
  endMs: number;
  transcript?: string;
  questions: Question[];
};

type ListeningTest = {
  slug: string;
  title: string;
  masterAudioUrl: string;
  sections: Section[];
};

type AnswersMap = Record<string, string>;

type ListeningAutosaveDraft = {
  answers?: AnswersMap;
  currentIdx?: number;
};

const LEGACY_LISTEN_KEY = (slug: string) => `listen:${slug}`;
const TOTAL_TIME_SEC = 30 * 60; // 30 minutes

export default function ListeningTestPage() {
  const router = useRouter();
  const { slug } = router.query as { slug?: string };

  // --- Auth state ---
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false); // gate UI until auth resolved

  // --- Test + UI state ---
  const [test, setTest] = useState<ListeningTest | null>(null);
  const [currentIdx, setCurrentIdxState] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [checked, setChecked] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [sectionProgressMs, setSectionProgressMs] = useState(0);
  const [pendingSeekMs, setPendingSeekMs] = useState<number | null>(null);

  // --- Save state ---
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // answers: questionId -> value
  const [answers, setAnswers] = useState<AnswersMap>({});
  const autosaveRef = useRef<AutosaveSession<ListeningAutosaveDraft> | null>(null);

  const patchAutosave = useCallback((partial: Partial<ListeningAutosaveDraft>) => {
    const session = autosaveRef.current;
    if (!session) return;
    session.patch(partial);
  }, []);

  const setSectionIndex = useCallback(
    (value: number | ((prev: number) => number)) => {
      setCurrentIdxState((prev) => {
        const resolved = typeof value === 'function' ? (value as (prev: number) => number)(prev) : value;
        const clamped = Number.isFinite(resolved) ? Math.max(0, Math.trunc(resolved)) : 0;
        patchAutosave({ currentIdx: clamped });
        return clamped;
      });
    },
    [patchAutosave],
  );

  // --- Timer ---
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME_SEC);
  const [attemptStarted, setAttemptStarted] = useState(false);
  const [attemptFinished, setAttemptFinished] = useState(false);
  const submittedRef = useRef(false);

  // --- Audio & timing handled via AudioSectionsPlayer ---

  // --- Load auth user (robust and race-free) ---
  useEffect(() => {
    let mounted = true;

    // 1) Get current user (in case session already present)
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
      setAuthReady(true);
    });

    // 2) Subscribe to future changes (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUserId(session?.user?.id ?? null);
      setAuthReady(true);
    });

    return () => {
      sub?.subscription.unsubscribe();
      mounted = false;
    };
  }, []);

  // --- Load test from DB ---
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      const { data: t, error: tErr } = await supabase
        .from('lm_listening_tests')
        .select('slug,title,master_audio_url')
        .eq('slug', slug)
        .single();

      if (tErr || !t || cancelled) return;

      const { data: sections, error: sErr } = await supabase
        .from('lm_listening_sections')
        .select('order_no,start_ms,end_ms,transcript')
        .eq('test_slug', slug)
        .order('order_no', { ascending: true });

      if (sErr || cancelled) return;

      const { data: questions, error: qErr } = await supabase
        .from('lm_listening_questions')
        .select('id,q_no,type,prompt,options,answer,section_order')
        .eq('test_slug', slug)
        .order('q_no', { ascending: true });

      if (qErr || cancelled) return;

      const secMap = new Map<number, Section>();
      (sections ?? []).forEach((s) => {
        secMap.set(s.order_no, {
          orderNo: s.order_no,
          startMs: s.start_ms,
          endMs: s.end_ms,
          transcript: s.transcript ?? undefined,
          questions: [],
        });
      });

      (questions ?? []).forEach((q) => {
        const sec = secMap.get(q.section_order);
        if (!sec) return;
        if (q.type === 'mcq') {
          sec.questions.push({
            id: q.id,
            qNo: q.q_no,
            type: 'mcq',
            prompt: q.prompt,
            options: (q.options ?? []) as string[],
            answer: q.answer,
          });
        } else {
          sec.questions.push({
            id: q.id,
            qNo: q.q_no,
            type: 'gap',
            prompt: q.prompt,
            answer: q.answer,
          });
        }
      });

      const ordered = [...secMap.values()]
        .sort((a, b) => a.orderNo - b.orderNo)
        .map((s) => ({ ...s, questions: [...s.questions].sort((a, b) => a.qNo - b.qNo) }));

      if (!cancelled) {
        setTest({
          slug: t.slug,
          title: t.title,
          masterAudioUrl: t.master_audio_url,
          sections: ordered,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // --- Rehydrate WIP (answers + section) from autosave ---
  useEffect(() => {
    if (!slug) return;
    setAnswers({});
    setCurrentIdxState(0);
    const session = createAutosaveSession<ListeningAutosaveDraft>({
      scope: 'listening',
      id: slug,
      version: 1,
      legacyKeys: [LEGACY_LISTEN_KEY(slug)],
    });
    autosaveRef.current = session;
    const snapshot = session.load();
    const draft = snapshot?.data;
    if (draft?.answers && typeof draft.answers === 'object') {
      setAnswers({ ...(draft.answers as AnswersMap) });
    }
    if (typeof draft?.currentIdx === 'number') {
      setCurrentIdxState(Math.max(0, draft.currentIdx));
    }
    return () => {
      autosaveRef.current = null;
    };
  }, [slug]);

  // --- Answer helpers ---
  const handleMCQ = (q: MCQ, val: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [q.id]: val };
      patchAutosave({ answers: next });
      return next;
    });
  };
  const handleGapChange = (q: GAP, val: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [q.id]: val };
      patchAutosave({ answers: next });
      return next;
    });
  };
  const handleGapBlur = (q: GAP) => {
    setAnswers((prev) => {
      const current = prev[q.id];
      if (typeof current !== 'string') return prev;
      const trimmed = current.trim();
      if (trimmed === current) return prev;
      const next = { ...prev, [q.id]: trimmed };
      patchAutosave({ answers: next });
      return next;
    });
  };
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const isCorrect = (q: Question) => {
    const a = String(answers[q.id] ?? '');
    return q.type === 'mcq'
      ? a === (q as MCQ).answer
      : normalize(a) === normalize((q as GAP).answer);
  };

  // --- Persist answers to DB (user-scoped rows) ---
  const persistAnswers = async () => {
    if (!userId || !test) return;
    setSaving(true);
    setSaveError(null);
    try {
      const rows = Object.entries(answers)
        .map(([qid, ans]) => {
          const q = test.sections.flatMap((s) => s.questions).find((qq) => qq.id === qid);
          if (!q) return null;
          const cleaned = typeof ans === 'string' ? ans.trim() : String(ans ?? '');
          return { user_id: userId, test_slug: test.slug, q_no: q.qNo, answer: cleaned };
        })
        .filter(Boolean) as Array<{ user_id: string; test_slug: string; q_no: number; answer: string }>;

      if (rows.length === 0) return;

      const nowIso = new Date().toISOString();
      const rowsWithTimestamp = rows.map((row) => ({ ...row, updated_at: nowIso }));

      const { error } = await supabase
        .from('lm_listening_user_answers')
        .upsert(rowsWithTimestamp, { onConflict: 'user_id,test_slug,q_no' });

      if (error) {
        const needsFallback = /column .*updated_at/i.test(error.message ?? '');
        if (!needsFallback) throw error;

        const { error: legacyError } = await supabase
          .from('lm_listening_user_answers')
          .upsert(rows, { onConflict: 'user_id,test_slug,q_no' });

        if (legacyError) throw legacyError;
      }
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? 'Failed to save';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  // --- Submit attempt via RPC (score + band) ---
  const submitAttempt = async (): Promise<string | null> => {
    if (!test || !userId) return null;
    const flat = test.sections.flatMap((s) => s.questions);
    const answersArr = Object.entries(answers)
      .map(([qid, ans]) => {
        const q = flat.find((qq) => qq.id === qid);
        if (!q) return null;
        const cleaned = typeof ans === 'string' ? ans.trim() : String(ans ?? '');
        return { qno: q.qNo, answer: cleaned };
      })
      .filter(Boolean) as { qno: number; answer: any }[];

    setSaveError(null);
    try {
      const resp = await fetch('/api/listening/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          test_slug: test.slug,
          answers: answersArr,
          meta: {
            duration_sec: TOTAL_TIME_SEC - Math.ceil(timeLeft),
            auto_play: autoPlay,
            section_index: currentIdx,
          },
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => null);
        const message = body?.error ?? 'Failed to submit attempt';
        throw new Error(message);
      }
      const body = await resp.json().catch(() => null);
      return (body?.attemptId as string | undefined) ?? null;
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? 'Failed to submit attempt';
      setSaveError(msg);
      return null;
    }
  };

  const handleAutoSubmit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setAttemptFinished(true);
    setChecked(true);
    (async () => {
      let attemptId: string | null = null;
      if (userId) {
        await persistAnswers();
        attemptId = await submitAttempt();
        if (!attemptId) {
          submittedRef.current = false;
          return;
        }
      }
      try {
        autosaveRef.current?.clear();
        if (slug) localStorage.removeItem(LEGACY_LISTEN_KEY(slug));
      } catch {}
      if (test) {
        const target = attemptId
          ? `/listening/${test.slug}/review?attemptId=${attemptId}`
          : `/listening/${test.slug}/review`;
        router.push(target);
      }
    })();
  };

  const secCount = test?.sections.length ?? 0;
  const currentSection = useMemo(() => (test ? test.sections[currentIdx] ?? null : null), [test, currentIdx]);
  const sliceSecs = currentSection
    ? Math.max(0, Math.round((currentSection.endMs - currentSection.startMs) / 1000))
    : 0;

  useEffect(() => {
    if (!test) return;
    setSectionIndex((idx) => {
      const max = Math.max(0, test.sections.length - 1);
      return Math.min(Math.max(0, idx), max);
    });
  }, [test, setSectionIndex]);

  useEffect(() => {
    setSectionProgressMs(0);
    setPendingSeekMs(null);
  }, [currentIdx]);

  // --- Loading skeleton ---
  if (!test) {
    return (
      <section className="py-24">
        <Container>
          <Card className="p-6">
            <div className="animate-pulse h-6 w-40 bg-muted dark:bg-white/10 rounded" />
          </Card>
        </Container>
      </section>
    );
  }

  const focusActive = attemptStarted && !attemptFinished;

  return (
    <>
      <FocusGuard
        exam="listening"
        slug={slug}
        active={focusActive}
        onFullscreenExit={() => {
          if (!attemptFinished) setAttemptStarted(false);
        }}
      />
      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-slab text-display text-gradient-primary">{test.title}</h1>
              <p className="text-grayish">Auto-play per section • Answer highlighting</p>
            </div>
            <div className="flex items-center gap-3">
              <SaveItemButton resourceId={slug || ''} type="listening" category="bookmark" />
              <Timer
                initialSeconds={TOTAL_TIME_SEC}
                onTick={(s) => {
                  const remaining = Math.ceil(s);
                  setTimeLeft(remaining);
                  if (!attemptStarted && !attemptFinished && remaining < TOTAL_TIME_SEC) {
                    setAttemptStarted(true);
                  }
                }}
                onComplete={handleAutoSubmit}
                running={!submittedRef.current}
              />
              <Badge variant={autoPlay ? 'success' : 'warning'}>Auto-play: {autoPlay ? 'On' : 'Off'}</Badge>
              <Button variant="secondary" onClick={() => setAutoPlay((v) => !v)}>
                Toggle Auto-play
              </Button>
            </div>
          </div>

          {/* Not logged-in notice (only when auth is actually known) */}
          {authReady && !userId && (
            <Alert variant="info" className="mt-6" title="Sign in to save progress">
              You can practice without signing in, but answers won’t be saved. (We only store your own rows; RLS enforced.)
            </Alert>
          )}

          {/* Save status */}
          {saveError && (
            <Alert variant="warning" className="mt-6" title="Couldn’t save">
              {saveError}
            </Alert>
          )}
          {saving && <Alert variant="info" className="mt-6">Saving…</Alert>}

          <AudioSectionsPlayer
            key={currentIdx}
            masterAudioUrl={test.masterAudioUrl}
            sections={test.sections}
            initialSectionIndex={currentIdx}
            autoAdvance={autoPlay}
            onSectionChange={setSectionIndex}
            onTimeUpdate={({ sectionMs }) => setSectionProgressMs(sectionMs)}
            seekToMs={pendingSeekMs}
            onExternalSeekResolved={() => setPendingSeekMs(null)}
            className="mt-8"
          />
          <Transcript
            className="mt-4"
            transcript={currentSection?.transcript}
            locked={!checked}
            currentTimeMs={sectionProgressMs}
            expanded={checked ? transcriptOpen : false}
            onExpandedChange={(next) => setTranscriptOpen(next)}
            onSeek={(relativeMs) => {
              if (!currentSection) return;
              setPendingSeekMs(currentSection.startMs + relativeMs);
            }}
          />
          <div className="mt-4 text-small opacity-80">
            Section {currentSection?.orderNo} of {secCount} • {sliceSecs}s slice
          </div>
          {!!userId && (
            <div className="mt-4">
              <Button variant="secondary" onClick={persistAnswers} disabled={saving}>
                Save progress
              </Button>
            </div>
          )}

          {/* Questions */}
          <div className="grid gap-6 mt-8 md:grid-cols-2">
            {currentSection?.questions.map((q) => (
              <Card key={q.id} className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">
                    Q{q.qNo}. {q.prompt}
                  </h3>
                  {checked && (
                    <Badge variant={isCorrect(q) ? 'success' : 'danger'} size="sm">
                      {isCorrect(q) ? 'Correct' : 'Incorrect'}
                    </Badge>
                  )}
                </div>

                {q.type === 'mcq' ? (
                  <ul className="mt-4 grid gap-2">
                    {(q as MCQ).options.map((opt) => {
                      const chosen = answers[q.id] === opt;
                      const correct = (q as MCQ).answer === opt;
                      const showState = checked && (chosen || correct);
                      const cls = showState
                        ? correct
                          ? 'border-success/50 bg-success/10'
                          : chosen
                          ? 'border-sunsetOrange/50 bg-sunsetOrange/10'
                          : 'border-lightBorder'
                        : 'border-lightBorder dark:border-white/10';
                      return (
                        <li key={opt}>
                          <button
                            type="button"
                            onClick={() => handleMCQ(q as MCQ, opt)}
                            className={`w-full text-left p-3.5 rounded-ds border ${cls}`}
                          >
                            <span className="mr-2">{opt}</span>
                            {checked && correct && (
                              <i className="fas fa-check-circle text-success" aria-label="Correct" />
                            )}
                            {checked && !correct && chosen && (
                              <i className="fas fa-times-circle text-sunsetOrange" aria-label="Incorrect" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="mt-4">
                    {!checked ? (
                      <Input
                        label=""
                        placeholder="Type your answer"
                        value={answers[q.id] ?? ''}
                        onChange={(e) => handleGapChange(q as GAP, (e.target as HTMLInputElement).value)}
                        onBlur={() => handleGapBlur(q as GAP)}
                      />
                    ) : (
                      <Alert variant={isCorrect(q) ? 'success' : 'warning'}>
                        <div className="flex flex-col">
                          <span>
                            <strong>Your answer:</strong> {answers[q.id] || <em>(blank)</em>}
                          </span>
                          {!isCorrect(q) && (
                            <span>
                              <strong>Correct:</strong> {(q as GAP).answer}
                            </span>
                          )}
                        </div>
                      </Alert>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-8">
            {!checked ? (
              <Button
                onClick={async () => {
                  setChecked(true);
                  if (userId) await persistAnswers();
                }}
              >
                Check answers
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setChecked(false)}>
                  Edit answers
                </Button>
                <Button
                  onClick={async () => {
                    if (!test) return;
                    if (userId) await persistAnswers();

                    if (currentIdx >= secCount - 1) {
                      let attemptId: string | null = null;
                      if (userId) {
                        attemptId = await submitAttempt();
                        if (!attemptId) {
                          submittedRef.current = false;
                          return;
                        }
                      }
                      submittedRef.current = true;
                      setAttemptFinished(true);
                      try {
                        autosaveRef.current?.clear();
                        if (slug) localStorage.removeItem(LEGACY_LISTEN_KEY(slug));
                      } catch {}
                      const target = attemptId
                        ? `/listening/${test.slug}/review?attemptId=${attemptId}`
                        : `/listening/${test.slug}/review`;
                      router.push(target);
                    } else {
                      setSectionIndex((i) => i + 1);
                      setChecked(false);
                    }
                  }}
                >
                  {currentIdx < secCount - 1 ? 'Next section' : 'Finish & Review'}
                </Button>
              </>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
