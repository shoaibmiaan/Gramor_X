import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card, CardContent, CardHeader } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import Recorder from '@/components/speaking/Recorder';
import samplePrompt from '@/data/speaking/sample-001.json';
import { uploadSpeakingBlob } from '@/lib/speaking/uploadSpeakingBlob';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

const FALLBACK_TITLE = 'IELTS Speaking Prompt';

type AttemptPart = 'p1' | 'p2' | 'p3';

type PromptPart1 = { introSeconds?: number; questions: string[] };
type PromptPart2 = {
  prepSeconds?: number;
  speakSeconds?: number;
  cueCard?: string;
  bullets: string[];
};
type PromptPart3 = { questions: string[] };

type SpeakingPrompt = {
  id: string;
  title?: string;
  description?: string;
  part1?: PromptPart1;
  part2?: PromptPart2;
  part3?: PromptPart3;
};

type UploadRecord = {
  id: string;
  attemptId: string;
  part: AttemptPart;
  path: string;
  signedUrl: string;
  createdAt: string;
  durationSec: number;
};

type ScoreResult = {
  attemptId: string;
  transcript: string;
  bandOverall: number;
  criteria: {
    fluency: number;
    lexical: number;
    grammar: number;
    pronunciation: number;
  };
  notes: string;
};

const SCORE_CRITERIA: Array<{ key: keyof ScoreResult['criteria']; label: string }> = [
  { key: 'fluency', label: 'Fluency & Coherence' },
  { key: 'lexical', label: 'Lexical Resource' },
  { key: 'grammar', label: 'Grammar' },
  { key: 'pronunciation', label: 'Pronunciation' },
];

type MaybePromptRow = {
  id?: string;
  title?: string;
  description?: string;
  prompt?: unknown;
  payload?: unknown;
  data?: unknown;
  part1?: unknown;
  part2?: unknown;
  part3?: unknown;
};

function safeNumber(value: unknown | null | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number.parseFloat(value);
    if (!Number.isNaN(n) && Number.isFinite(n)) return n;
  }
  return undefined;
}

function safeString(value: unknown | null | undefined): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  return undefined;
}

function safeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === 'string') return value.split(/\n+/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function normalizePrompt(raw: MaybePromptRow | null | undefined, fallbackId: string): SpeakingPrompt | null {
  if (!raw) return null;
  const base = (raw.prompt as MaybePromptRow) || (raw.payload as MaybePromptRow) || (raw.data as MaybePromptRow) || raw;
  const id = base?.id || raw.id || fallbackId;
  const title = safeString(base?.title) || safeString(raw.title) || FALLBACK_TITLE;
  const description = safeString(base?.description) || safeString(raw.description);

  const part1Raw: any = base?.part1 ?? raw.part1;
  const part2Raw: any = base?.part2 ?? raw.part2;
  const part3Raw: any = base?.part3 ?? raw.part3;

  const part1: PromptPart1 | undefined = part1Raw
    ? {
        introSeconds: safeNumber(part1Raw.introSeconds ?? part1Raw.intro_seconds ?? part1Raw.prepSeconds),
        questions: safeStringArray(part1Raw.questions ?? part1Raw.items ?? part1Raw.prompts ?? []),
      }
    : undefined;

  const bulletsRaw = safeStringArray(part2Raw?.bullets ?? part2Raw?.points ?? part2Raw?.youShouldSay);

  const part2: PromptPart2 | undefined = part2Raw
    ? {
        prepSeconds: safeNumber(part2Raw.prepSeconds ?? part2Raw.prep_seconds ?? part2Raw.preparationSeconds),
        speakSeconds: safeNumber(part2Raw.speakSeconds ?? part2Raw.speak_seconds ?? part2Raw.durationSeconds),
        cueCard: safeString(part2Raw.cueCard ?? part2Raw.prompt ?? part2Raw.topic ?? part2Raw.task),
        bullets: bulletsRaw.length > 0 ? bulletsRaw : safeStringArray(part2Raw?.bullets ?? part2Raw?.points),
      }
    : undefined;

  const part3: PromptPart3 | undefined = part3Raw
    ? { questions: safeStringArray(part3Raw.questions ?? part3Raw.prompts ?? part3Raw.items ?? []) }
    : undefined;

  return {
    id: id || fallbackId,
    title,
    description,
    part1,
    part2,
    part3,
  };
}

const SAMPLE_PROMPTS: Record<string, SpeakingPrompt> = {
  [samplePrompt.id]: normalizePrompt(samplePrompt as MaybePromptRow, samplePrompt.id) ?? {
    id: samplePrompt.id,
    title: FALLBACK_TITLE,
    part1: {
      introSeconds: safeNumber((samplePrompt as any).part1?.introSeconds),
      questions: safeStringArray((samplePrompt as any).part1?.questions ?? []),
    },
    part2: {
      prepSeconds: safeNumber((samplePrompt as any).part2?.prepSeconds),
      speakSeconds: safeNumber((samplePrompt as any).part2?.speakSeconds),
      cueCard: safeString((samplePrompt as any).part2?.cueCard),
      bullets: [],
    },
    part3: {
      questions: safeStringArray((samplePrompt as any).part3?.questions ?? []),
    },
  },
};

function parsePart(input: string | string[] | undefined): AttemptPart | null {
  const value = Array.isArray(input) ? input[0] : input;
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === 'p1' || normalized === 'part1') return 'p1';
  if (normalized === 'p2' || normalized === 'part2') return 'p2';
  if (normalized === 'p3' || normalized === 'part3') return 'p3';
  return null;
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function SpeakingPromptPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [promptLoading, setPromptLoading] = useState(true);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<SpeakingPrompt | null>(null);
  const [activePart, setActivePart] = useState<AttemptPart | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [busy, setBusy] = useState(false);

  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoringError, setScoringError] = useState<string | null>(null);

  const scoreMapRef = useRef<Partial<Record<AttemptPart, ScoreResult>>>({});

  const attemptMapRef = useRef<Record<AttemptPart, string>>({});
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);

  const promptId = useMemo(() => {
    if (!router.isReady) return null;
    const raw = router.query.promptId;
    return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : null;
  }, [router.isReady, router.query.promptId]);

  const queryPart = useMemo(() => parsePart(router.query.part), [router.query.part]);

  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;
    supabaseBrowser.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data.session) {
          const next = encodeURIComponent(router.asPath || `/speaking/${promptId ?? ''}`);
          router.replace(`/login?next=${next}`);
        }
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router, promptId]);

  const loadPrompt = useCallback(async (id: string) => {
    setPromptLoading(true);
    setPromptError(null);
    try {
      const client: any = supabaseBrowser;
      const { data, error } = await client.from('speaking_prompts').select('*').eq('id', id).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      const normalized = normalizePrompt(data as MaybePromptRow, id);
      if (normalized) {
        setPrompt(normalized);
        return;
      }
    } catch (err: any) {
      if (err?.code !== '42P01') {
        setPromptError(err?.message || 'Could not load prompt');
      }
    }
    const fallback = SAMPLE_PROMPTS[id] || null;
    if (fallback) {
      setPrompt(fallback);
    } else {
      setPromptError('Prompt not found.');
      setPrompt(null);
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (!promptId) {
      setPrompt(null);
      setPromptError('Prompt not found.');
      setPromptLoading(false);
      return;
    }
    void loadPrompt(promptId).finally(() => setPromptLoading(false));
  }, [router.isReady, promptId, loadPrompt]);

  const availableParts = useMemo(() => {
    const parts: Array<{ key: AttemptPart; label: string }> = [];
    if (prompt?.part1?.questions?.length) parts.push({ key: 'p1', label: 'Part 1' });
    if (prompt?.part2?.cueCard || prompt?.part2?.bullets?.length) parts.push({ key: 'p2', label: 'Part 2' });
    if (prompt?.part3?.questions?.length) parts.push({ key: 'p3', label: 'Part 3' });
    return parts;
  }, [prompt]);

  useEffect(() => {
    if (!availableParts.length) {
      setActivePart(null);
      return;
    }
    if (queryPart && availableParts.some((part) => part.key === queryPart)) {
      setActivePart(queryPart);
      return;
    }
    setActivePart((prev) => (prev && availableParts.some((part) => part.key === prev) ? prev : availableParts[0]?.key ?? null));
  }, [availableParts, queryPart]);

  useEffect(() => {
    if (!activePart) {
      setCurrentAttemptId(null);
      return;
    }
    const existing = attemptMapRef.current[activePart];
    setCurrentAttemptId(existing ?? null);
  }, [activePart]);

  useEffect(() => {
    if (!activePart) {
      setScoreResult(null);
      setScoringError(null);
      return;
    }
    setScoreResult(scoreMapRef.current[activePart] ?? null);
    setScoringError(null);
  }, [activePart]);

  const ensureAttempt = useCallback(async () => {
    if (!activePart) throw new Error('Select a part before recording');
    const existing = attemptMapRef.current[activePart];
    if (existing) {
      setCurrentAttemptId(existing);
      return existing;
    }
    const { data } = await supabaseBrowser.auth.getSession();
    const session = data.session;
    if (!session) throw new Error('You must be signed in to record.');

    const res = await fetch('/api/speaking/start-attempt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        part: activePart,
        mode: 'prompt',
        promptId,
        promptTitle: prompt?.title,
      }),
      credentials: 'include',
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.error || 'Failed to start attempt');
    const id = payload?.attemptId || payload?.id;
    if (!id) throw new Error('Attempt ID missing in response');
    attemptMapRef.current[activePart] = id;
    setCurrentAttemptId(id);

    try {
      if (promptId) {
        await (supabaseBrowser as any)
          .from('speaking_attempts')
          .update({ prompt_id: promptId, prompts: prompt })
          .eq('id', id);
      }
    } catch {
      // best-effort metadata update
    }

    return id;
  }, [activePart, promptId, prompt?.title, prompt]);

  const setScoreForPart = useCallback(
    (part: AttemptPart, result: ScoreResult | null) => {
      if (result) {
        scoreMapRef.current[part] = result;
      } else {
        delete scoreMapRef.current[part];
      }
      if (activePart === part) {
        setScoreResult(result);
        if (!result) setScoringError(null);
      }
    },
    [activePart],
  );

  const registerAudio = useCallback(
    async (attemptId: string, part: AttemptPart, path: string) => {
      const res = await fetch('/api/speaking/attempts/add-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, part, path }),
        credentials: 'include',
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Failed to register audio clip');
      }
      return payload.audioUrls as Record<string, string[]>;
    },
    [],
  );

  const scoreAttempt = useCallback(
    async (attemptId: string, part: AttemptPart) => {
      setScoring(true);
      if (activePart === part) setScoringError(null);

      const parseScoreValue = (value: any) => {
        const num =
          typeof value === 'number'
            ? value
            : typeof value === 'string'
            ? Number.parseFloat(value)
            : Number.NaN;
        return Number.isFinite(num) ? num : 0;
      };

      try {
        const res = await fetch('/api/speaking/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId }),
          credentials: 'include',
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload?.message || payload?.error || 'Failed to score attempt');
        }

        if (typeof payload.bandOverall !== 'number' || !payload?.criteria) {
          throw new Error('Scoring response incomplete');
        }

        const clampScore = (value: number) => Math.min(9, Math.max(0, Math.round(value * 10) / 10));

        const result: ScoreResult = {
          attemptId,
          transcript: typeof payload.transcript === 'string' ? payload.transcript.trim() : '',
          bandOverall: clampScore(parseScoreValue(payload.bandOverall)),
          criteria: {
            fluency: clampScore(parseScoreValue(payload?.criteria?.fluency)),
            lexical: clampScore(parseScoreValue(payload?.criteria?.lexical)),
            grammar: clampScore(parseScoreValue(payload?.criteria?.grammar)),
            pronunciation: clampScore(parseScoreValue(payload?.criteria?.pronunciation)),
          },
          notes: typeof payload.notes === 'string' ? payload.notes.trim() : '',
        };

        setScoreForPart(part, result);
        if (activePart === part) setScoringError(null);
        return result;
      } catch (error: any) {
        const message = error?.message || 'Failed to score attempt';
        if (activePart === part) setScoringError(message);
        throw error instanceof Error ? error : new Error(message);
      } finally {
        setScoring(false);
      }
    },
    [activePart, setScoreForPart],
  );

  const handleManualScore = useCallback(async () => {
    if (!activePart || !currentAttemptId) return;
    setStatus('Scoring your answer…');
    try {
      await scoreAttempt(currentAttemptId, activePart);
      setStatus('Scoring complete! Review your feedback below.');
    } catch (error: any) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'AI scoring is unavailable right now.';
      setStatus(message);
    }
  }, [activePart, currentAttemptId, scoreAttempt]);

  const handleRecordingComplete = useCallback(
    async (file: File, meta: { durationSec: number; mime: string }) => {
      if (!activePart) throw new Error('Select a part before uploading');
      const part = activePart;
      const existingAttemptId = attemptMapRef.current[part];
      setBusy(true);
      setStatus('Uploading your recording…');
      setUploadError(null);
      try {
        const attemptId = await ensureAttempt();
        if (!existingAttemptId || existingAttemptId !== attemptId) {
          setScoreForPart(part, null);
        }
        const { signedUrl, path } = await uploadSpeakingBlob(file, part, attemptId);
        await registerAudio(attemptId, part, path);
        const record: UploadRecord = {
          id: randomId(),
          attemptId,
          part,
          path,
          signedUrl,
          createdAt: new Date().toISOString(),
          durationSec: meta.durationSec,
        };
        setUploads((prev) => [...prev, record]);
        setStatus('Upload complete. Scoring your answer…');

        try {
          await scoreAttempt(attemptId, part);
          setStatus('Scoring complete! Review your feedback below.');
        } catch (scoreError: any) {
          const failMessage =
            scoreError instanceof Error && scoreError.message
              ? scoreError.message
              : 'AI scoring is unavailable right now.';
          setStatus(`Recording saved. ${failMessage}`);
        }
      } catch (error: any) {
        const message = error?.message || 'Failed to upload recording';
        setUploadError(message);
        setStatus(null);
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [activePart, ensureAttempt, registerAudio, scoreAttempt, setScoreForPart],
  );

  const renderPartContent = useMemo(() => {
    if (!activePart || !prompt) return null;
    if (activePart === 'p1' && prompt.part1) {
      return (
        <div className="space-y-4">
          {prompt.part1.introSeconds ? (
            <p className="text-muted-foreground text-sm">Intro time: {prompt.part1.introSeconds}s</p>
          ) : null}
          <ol className="space-y-2 list-decimal pl-4">
            {prompt.part1.questions.map((question, idx) => (
              <li key={idx} className="text-base text-foreground">
                {question}
              </li>
            ))}
          </ol>
        </div>
      );
    }
    if (activePart === 'p2' && prompt.part2) {
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {prompt.part2.prepSeconds ? <span>Prep time: {prompt.part2.prepSeconds}s</span> : null}
            {prompt.part2.speakSeconds ? <span>Speak for: {prompt.part2.speakSeconds}s</span> : null}
          </div>
          {prompt.part2.cueCard ? <p className="text-lg font-medium">{prompt.part2.cueCard}</p> : null}
          {prompt.part2.bullets?.length ? (
            <ul className="space-y-2 list-disc pl-4">
              {prompt.part2.bullets.map((item, idx) => (
                <li key={idx} className="text-base text-foreground">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    }
    if (activePart === 'p3' && prompt.part3) {
      return (
        <ol className="space-y-2 list-decimal pl-4">
          {prompt.part3.questions.map((question, idx) => (
            <li key={idx} className="text-base text-foreground">
              {question}
            </li>
          ))}
        </ol>
      );
    }
    return <p className="text-sm text-muted-foreground">No prompt content available for this part.</p>;
  }, [activePart, prompt]);

  const title = prompt?.title || FALLBACK_TITLE;

  if (!authChecked || promptLoading) {
    return (
      <Container className="py-16">
        <Head>
          <title>{title}</title>
        </Head>
        <p className="text-muted-foreground">Loading prompt…</p>
      </Container>
    );
  }

  if (!promptId || promptError) {
    return (
      <Container className="py-16 space-y-4">
        <Head>
          <title>{title}</title>
        </Head>
        <Card>
          <CardContent>
            <p className="text-danger font-medium">{promptError || 'Invalid prompt id.'}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              <Link href="/speaking">Go back to speaking practice</Link>
            </p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-10 space-y-8">
      <Head>
        <title>{title}</title>
      </Head>
      <div>
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        {prompt?.description ? (
          <p className="mt-2 max-w-3xl text-muted-foreground">{prompt.description}</p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Prompt</span>
              {currentAttemptId ? (
                <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                  Attempt {currentAttemptId.slice(0, 6)}…
                </span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {availableParts.map((part) => (
                <button
                  key={part.key}
                  type="button"
                  onClick={() => setActivePart(part.key)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    part.key === activePart
                      ? 'border-primary bg-primary text-white'
                      : 'border-border bg-background text-muted-foreground hover:bg-border/40'
                  }`}
                >
                  {part.label}
                </button>
              ))}
            </div>
            <div>{renderPartContent}</div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="h-fit" aria-busy={busy}>
            <CardHeader>
              <h2 className="text-lg font-semibold">Record your answer</h2>
            </CardHeader>
            <CardContent>
              <Recorder onComplete={handleRecordingComplete} maxDurationSec={180} />
              {status ? <p className="mt-4 text-sm text-muted-foreground">{status}</p> : null}
              {uploadError ? <p className="mt-4 text-sm text-danger">{uploadError}</p> : null}
              <p className="mt-4 text-xs text-muted-foreground">
                Audio uploads are stored securely in Supabase Storage for grading. You can re-record as many times as you like.
              </p>
            </CardContent>
          </Card>

          <Card className="h-fit" aria-busy={scoring}>
            <CardHeader>
              <h2 className="text-lg font-semibold">AI feedback</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              {scoreResult ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Overall band</span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-semibold text-foreground">
                        {scoreResult.bandOverall.toFixed(1)}
                      </span>
                      <span className="text-sm text-muted-foreground">/ 9.0</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {SCORE_CRITERIA.map(({ key, label }) => (
                      <div key={key} className="rounded-lg border border-border/60 p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">
                          {scoreResult.criteria[key].toFixed(1)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {scoreResult.notes ? (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Feedback</h3>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {scoreResult.notes}
                      </p>
                    </div>
                  ) : null}
                  {scoreResult.transcript ? (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Transcript</h3>
                      <p className="mt-1 whitespace-pre-wrap rounded-md border border-border/60 p-3 text-sm text-muted-foreground">
                        {scoreResult.transcript}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Record your answer to receive IELTS-style scoring and examiner feedback automatically.
                </p>
              )}
              {scoring ? <p className="text-xs text-muted-foreground">Scoring in progress…</p> : null}
              {scoringError ? <p className="text-sm text-danger">{scoringError}</p> : null}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={handleManualScore}
                  disabled={!currentAttemptId || scoring || busy}
                  variant="outline"
                  className="rounded-full"
                >
                  {scoring ? 'Scoring…' : 'Re-score this attempt'}
                </Button>
                {currentAttemptId ? (
                  <span className="text-xs text-muted-foreground">Attempt {currentAttemptId.slice(0, 8)}…</span>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Previous uploads</h2>
            </CardHeader>
            <CardContent>
              {uploads.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recordings saved yet.</p>
              ) : (
                <ul className="space-y-4">
                  {uploads.map((upload) => (
                    <li key={upload.id} className="rounded-lg border border-border/70 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">Part {upload.part.slice(-1)}</span>
                        <span className="text-muted-foreground">• {Math.round(upload.durationSec)}s</span>
                        <span className="text-muted-foreground">
                          Saved {new Date(upload.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2 break-all text-xs text-muted-foreground">{upload.path}</div>
                      <div className="mt-3">
                        <a
                          href={upload.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          Open signed audio URL
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
