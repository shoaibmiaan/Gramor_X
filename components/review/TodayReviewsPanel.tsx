import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/design-system/Card';
import { Icon } from '@/components/design-system/Icon';
import { Input } from '@/components/design-system/Input';
import { Textarea } from '@/components/design-system/Textarea';
import { LearningPathChip } from '@/components/review/LearningPathChip';
import type { ReviewDueResponse, ReviewQueueEnvelope, SkillKey } from '@/types/review';

const SESSION_LIMIT = 10;
const BLANK_PLACEHOLDER = '_____';
const SKILL_SEQUENCE: SkillKey[] = ['reading', 'listening', 'writing', 'speaking'];
const SKILL_LABELS: Record<SkillKey, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};
const SKILL_TARGETS: Record<SkillKey, number> = {
  reading: 3,
  listening: 1,
  writing: 3,
  speaking: 3,
};

function resolveWordId(item: ReviewQueueEnvelope): string | null {
  const { card, queue } = item;
  if (card.type === 'word') {
    return card.word?.id ?? queue.item_ref_id;
  }
  if (card.type === 'collocation') {
    return card.collocation?.word_id ?? card.word?.id ?? null;
  }
  return card.example?.word_id ?? card.word?.id ?? null;
}

type AudioSource = {
  audio_url?: Record<string, string> | null;
  tts_provider?: string | null;
  voice?: string | null;
};

function selectAudioUrl(source?: AudioSource | null) {
  if (!source?.audio_url) return null;
  const prioritizedKeys = ['us', 'uk', 'en-US', 'en-GB'];
  for (const key of prioritizedKeys) {
    const candidate = source.audio_url[key];
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }

  const values = Object.values(source.audio_url).filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
  return values[0] ?? null;
}

function normaliseText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string) {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1,
        );
      }
    }
  }

  return matrix[a.length][b.length];
}

function computeSimilarity(expected: string, actual: string) {
  const cleanExpected = normaliseText(expected);
  const cleanActual = normaliseText(actual);

  if (!cleanExpected || !cleanActual) return 0;

  const distance = levenshteinDistance(cleanExpected, cleanActual);
  const maxLen = Math.max(cleanExpected.length, cleanActual.length);
  if (maxLen === 0) return 1;

  const similarity = 1 - distance / maxLen;
  return Number(similarity.toFixed(2));
}

function createSpeechRecognition(): SpeechRecognition | null {
  if (typeof window === 'undefined') return null;
  const anyWindow = window as typeof window & {
    SpeechRecognition?: { new (): SpeechRecognition };
    webkitSpeechRecognition?: { new (): SpeechRecognition };
  };
  const Ctor = anyWindow.SpeechRecognition ?? anyWindow.webkitSpeechRecognition;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch (error) {
    console.warn('[TodayReviewsPanel] failed to create SpeechRecognition', error);
    return null;
  }
}

function formatScoreLabel(score: number | null) {
  if (score === null || Number.isNaN(score)) return '';
  return `${Math.round(score * 100)}% match`;
}

function buildAttemptFeatures(options: { transcript: string; target: string; score: number }) {
  return {
    transcript: options.transcript,
    target: options.target,
    similarity: options.score,
  };
}

function AudioPlayButton({
  audio,
  label,
  onPlay,
}: {
  audio?: AudioSource | null;
  label: string;
  onPlay?: (url: string) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const url = useMemo(() => selectAudioUrl(audio), [audio]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = useCallback(() => {
    if (!url) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const element = new Audio(url);
    audioRef.current = element;
    element.onended = () => {
      setPlaying(false);
      audioRef.current = null;
    };
    element.onerror = () => {
      setPlaying(false);
      audioRef.current = null;
    };

    const playPromise = element.play();

    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          setPlaying(true);
          onPlay?.(url);
        })
        .catch((error) => {
          console.warn('[TodayReviewsPanel] audio play failed', error);
          setPlaying(false);
          audioRef.current = null;
        });
    } else {
      setPlaying(true);
      onPlay?.(url);
    }
  }, [onPlay, url]);

  if (!url) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="rounded-ds-xl"
      onClick={handlePlay}
      leadingIcon={<Icon name={playing ? 'Volume2' : 'Play'} aria-hidden />}
    >
      {playing ? 'Playing…' : label}
    </Button>
  );
}

function SkillProgressRing({
  label,
  attempts,
  target,
}: {
  label: string;
  attempts: number;
  target: number;
}) {
  const ratio = target > 0 ? Math.min(1, Math.max(0, attempts / target)) : 0;
  const degrees = Math.round(ratio * 360);
  const percent = Math.round(ratio * 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          backgroundImage: `conic-gradient(var(--ds-primary) 0deg ${degrees}deg, var(--ds-border) ${degrees}deg 360deg)`,
        }}
        role="img"
        aria-label={`${label} attempts ${attempts} of ${target}`}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background text-xs font-semibold text-foreground">
          {percent}%
        </div>
      </div>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-[10px] text-muted-foreground">{attempts}/{target}</span>
    </div>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskCollocationChunk(chunk: string, headword?: string | null) {
  if (!chunk) return 'Collocation prompt';
  if (!headword) {
    const parts = chunk.split(' ');
    if (parts.length === 0) return BLANK_PLACEHOLDER;
    parts[0] = BLANK_PLACEHOLDER;
    return parts.join(' ');
  }

  const pattern = new RegExp(`\\b${escapeRegExp(headword)}\\b`, 'i');
  if (pattern.test(chunk)) {
    return chunk.replace(pattern, BLANK_PLACEHOLDER);
  }

  const parts = chunk.split(' ');
  if (parts.length === 0) return BLANK_PLACEHOLDER;
  parts[0] = BLANK_PLACEHOLDER;
  return parts.join(' ');
}

function highlightHeadword(chunk: string, headword?: string | null) {
  if (!chunk || !headword) return chunk;

  const lower = headword.toLowerCase();
  const pattern = new RegExp(`(${escapeRegExp(headword)})`, 'ig');
  const segments = chunk.split(pattern).filter((segment) => segment.length > 0);

  return segments.map((segment, index) => {
    if (segment.toLowerCase() === lower) {
      return (
        <span key={`segment-${index}`} className="font-semibold text-primary">
          {segment}
        </span>
      );
    }

    return <React.Fragment key={`segment-${index}`}>{segment}</React.Fragment>;
  });
}

const EASE_OPTIONS: Array<{
  value: 1 | 2 | 3 | 4;
  label: string;
  tone: 'danger' | 'warning' | 'primary' | 'success';
  description: string;
  shortcut: string;
}> = [
  { value: 1, label: 'Again', tone: 'danger', description: 'Repeat immediately', shortcut: '1' },
  { value: 2, label: 'Hard', tone: 'warning', description: 'Review soon', shortcut: '2' },
  { value: 3, label: 'Good', tone: 'primary', description: 'On schedule', shortcut: '3' },
  { value: 4, label: 'Easy', tone: 'success', description: 'Push interval', shortcut: '4' },
];

type ActionState = 'grade' | 'suspend' | null;

export function TodayReviewsPanel() {
  const [sessionCount, setSessionCount] = useState(0);
  const [data, setData] = useState<ReviewDueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ActionState>(null);
  const [activeEase, setActiveEase] = useState<1 | 2 | 3 | 4 | null>(null);
  const [revealed, setRevealed] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [pronListening, setPronListening] = useState(false);
  const [pronFeedback, setPronFeedback] = useState<string | null>(null);
  const [pronSuccess, setPronSuccess] = useState<boolean | null>(null);
  const [writingText, setWritingText] = useState('');
  const [writingFeedback, setWritingFeedback] = useState<string | null>(null);
  const [writingScore, setWritingScore] = useState<number | null>(null);
  const [writingLoading, setWritingLoading] = useState(false);
  const [readingResponses, setReadingResponses] = useState<Record<string, string>>({});
  const [readingResults, setReadingResults] = useState<
    Array<{ id: string; label: string; expected: string; response: string; correct: boolean }>
  >([]);
  const [readingFeedback, setReadingFeedback] = useState<string | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [skillOverrides, setSkillOverrides] = useState<Record<string, Partial<Record<SkillKey, number>>>>({});

  const loadDue = useCallback(async (initial = false) => {
    try {
      if (initial) setLoading(true);
      else setRefreshing(true);

      const res = await fetch(`/api/review/due?limit=${SESSION_LIMIT}`);
      if (!res.ok) {
        throw new Error(`Failed to load queue: ${res.status}`);
      }

      const json = (await res.json()) as ReviewDueResponse;
      setData(json);
      setError(null);
    } catch (err) {
      console.error('[TodayReviewsPanel] load error', err);
      setError('Unable to load today\'s reviews. Please try again.');
    } finally {
      if (initial) setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDue(true);
  }, [loadDue]);

  const currentItem = data?.items[0] ?? null;
  const sessionGoal = data?.dailyQuota ?? SESSION_LIMIT;
  const sessionDone = sessionCount >= sessionGoal && sessionGoal > 0;

  useEffect(() => {
    if (!currentItem) {
      setRevealed(false);
      return;
    }

    setRevealed(false);
    setWritingText('');
    setWritingFeedback(null);
    setWritingScore(null);
    setReadingResponses({});
    setReadingResults([]);
    setReadingFeedback(null);
    setWritingLoading(false);
    setReadingLoading(false);
  }, [currentItem?.queue.item_ref_id, currentItem?.queue.item_type]);

  useEffect(() => {
    setPronFeedback(null);
    setPronSuccess(null);
    setPronListening(false);

    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('[TodayReviewsPanel] failed to stop recognition', err);
      }
      recognitionRef.current = null;
    }
  }, [currentItem?.queue.item_ref_id, currentItem?.queue.item_type]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.warn('[TodayReviewsPanel] cleanup recognition failed', err);
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const totals = data?.totals ?? { word: 0, collocation: 0, gap: 0, overall: 0 };
  const grading = pendingAction === 'grade';
  const suspending = pendingAction === 'suspend';

  const mixSummary = useMemo(() => {
    if (!data?.requestedMix || data.requestedMix.length === 0) {
      return 'word • collocation • gap';
    }

    const counts = data.requestedMix.reduce<Record<string, number>>((acc, type) => {
      acc[type] = (acc[type] ?? 0) + 1;
      return acc;
    }, {});

    const total = data.requestedMix.length;
    return Object.entries(counts)
      .map(([type, count]) => `${type} ${Math.round((count / total) * 100)}%`)
      .join(' • ');
  }, [data?.requestedMix]);

  const handleGrade = useCallback(
    async (ease: 1 | 2 | 3 | 4) => {
      if (!currentItem) return;
      try {
        setRevealed(true);
        setPendingAction('grade');
        setActiveEase(ease);
        setError(null);

        const res = await fetch('/api/review/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_type: currentItem.queue.item_type,
            item_id: currentItem.queue.item_ref_id,
            ease,
          }),
        });

        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? 'Failed to record grade');
        }

        setSessionCount((count) => count + 1);
        await loadDue(false);
      } catch (err) {
        console.error('[TodayReviewsPanel] grade error', err);
        setError(err instanceof Error ? err.message : 'Failed to record grade.');
      } finally {
        setPendingAction(null);
        setActiveEase(null);
      }
    },
    [currentItem, loadDue],
  );

  const handleSuspend = useCallback(async () => {
    if (!currentItem) return;
    try {
      setPendingAction('suspend');
      setError(null);

      const res = await fetch('/api/review/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: currentItem.queue.item_type,
          item_id: currentItem.queue.item_ref_id,
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Failed to suspend item');
      }

      await loadDue(false);
    } catch (err) {
      console.error('[TodayReviewsPanel] suspend error', err);
      setError(err instanceof Error ? err.message : 'Failed to suspend item.');
    } finally {
      setPendingAction(null);
    }
  }, [currentItem, loadDue]);

  const handlePronunciation = useCallback(
    async (item: ReviewQueueEnvelope) => {
      if (item.card.type !== 'word') {
        setPronFeedback('Pronunciation drills are only available for word cards right now.');
        setPronSuccess(false);
        return;
      }

      const targetWord = item.card.word?.headword;
      const wordId = item.card.word?.id ?? item.queue.item_ref_id;

      if (!targetWord || !wordId) {
        setPronFeedback('No target word available for pronunciation practice.');
        setPronSuccess(false);
        return;
      }

      const recognition = createSpeechRecognition();
      if (!recognition) {
        setPronFeedback('Speech recognition is not supported in this browser.');
        setPronSuccess(false);
        return;
      }

      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.warn('[TodayReviewsPanel] failed to stop previous recognition', err);
        }
      }

      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      (recognition as any).interimResults = false;
      (recognition as any).maxAlternatives = 2;

      setPronListening(true);
      setPronFeedback('Listening…');
      setPronSuccess(null);

      recognition.onresult = (event: any) => {
        try {
          recognition.stop();
        } catch (err) {
          console.warn('[TodayReviewsPanel] recognition stop error', err);
        }

        const transcript = event?.results?.[0]?.[0]?.transcript?.trim?.() ?? '';
        if (!transcript) {
          setPronFeedback('I could not hear a word. Please try again.');
          setPronSuccess(false);
          setPronListening(false);
          return;
        }

        const similarity = computeSimilarity(targetWord, transcript);
        const success = similarity >= 0.75;
        setPronSuccess(success);
        setPronListening(false);

        const label = success ? 'Great job!' : 'Keep practicing';
        setPronFeedback(`${label} Heard “${transcript}” — ${formatScoreLabel(similarity)}.`);

        void (async () => {
          try {
            const response = await fetch('/api/speaking/attempt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                word_id: wordId,
                item_type: item.card.type,
                example_id: null,
                score: similarity,
                transcript,
                target_text: targetWord,
                features: buildAttemptFeatures({ transcript, target: targetWord, score: similarity }),
              }),
            });

            if (response.ok) {
              const payload = (await response.json().catch(() => null)) as { pron_attempts?: number } | null;
              if (payload && typeof payload.pron_attempts === 'number') {
                setSkillOverrides((prev) => ({
                  ...prev,
                  [wordId]: { ...prev[wordId], speaking: payload.pron_attempts },
                }));
              }
            }
          } catch (err) {
            console.warn('[TodayReviewsPanel] pronunciation attempt logging failed', err);
          }
        })();
      };

      recognition.onerror = (event: any) => {
        const message = event?.error === 'no-speech'
          ? 'No speech detected. Please try again.'
          : 'Speech recognition error. Please retry.';
        setPronFeedback(message);
        setPronSuccess(false);
        setPronListening(false);
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        setPronListening(false);
      };

      try {
        recognition.start();
      } catch (err) {
        console.error('[TodayReviewsPanel] failed to start recognition', err);
        setPronFeedback('Unable to start pronunciation check.');
        setPronSuccess(false);
        setPronListening(false);
      }
    },
    [],
  );

  const handleListeningAttempt = useCallback(
    async (item: ReviewQueueEnvelope, audioUrl: string | null) => {
      const wordId = resolveWordId(item);
      if (!wordId) return;

      try {
        const response = await fetch('/api/listening/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word_id: wordId,
            item_type: item.card.type,
            audio_url: audioUrl,
          }),
        });

        if (response.ok) {
          const payload = (await response.json().catch(() => null)) as { listening_attempts?: number } | null;
          if (payload && typeof payload.listening_attempts === 'number') {
            setSkillOverrides((prev) => ({
              ...prev,
              [wordId]: { ...prev[wordId], listening: payload.listening_attempts },
            }));
          }
        }
      } catch (error) {
        console.warn('[TodayReviewsPanel] listening attempt logging failed', error);
      }
    },
    [],
  );

  const handleWritingEval = useCallback(async () => {
    if (!currentItem) return;
    const writingSkill = currentItem.card.skills?.writing;
    const wordId = resolveWordId(currentItem);

    if (!wordId || !writingSkill) {
      setWritingFeedback('Writing drill unavailable for this card.');
      setWritingScore(null);
      return;
    }

    if (!writingText.trim()) {
      setWritingFeedback('Write at least one sentence to evaluate.');
      setWritingScore(null);
      return;
    }

    setWritingLoading(true);
    try {
      const response = await fetch('/api/writing/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word_id: wordId,
          item_type: currentItem.card.type,
          text: writingText,
          prompt: writingSkill.prompt,
          register: writingSkill.register ?? null,
          suggested_collocations: writingSkill.suggestedCollocations,
        }),
      });

      const payloadJson = (await response.json().catch(() => ({}))) as {
        error?: string;
        score?: number;
        feedback?: string;
        writing_attempts?: number;
      };
      if (!response.ok) {
        throw new Error(payloadJson.error ?? 'Failed to evaluate writing');
      }

      const payload = payloadJson;
      setWritingScore(typeof payload.score === 'number' ? payload.score : null);
      setWritingFeedback(payload.feedback ?? 'Attempt recorded.');
      if (typeof payload.writing_attempts === 'number') {
        setSkillOverrides((prev) => ({
          ...prev,
          [wordId]: { ...prev[wordId], writing: payload.writing_attempts },
        }));
      }
    } catch (error) {
      console.error('[TodayReviewsPanel] writing eval error', error);
      setWritingFeedback(error instanceof Error ? error.message : 'Writing evaluation failed.');
      setWritingScore(null);
    } finally {
      setWritingLoading(false);
    }
  }, [currentItem, writingText]);

  const handleReadingEval = useCallback(async () => {
    if (!currentItem) return;
    const readingSkill = currentItem.card.skills?.reading;
    const wordId = resolveWordId(currentItem);

    if (!wordId || !readingSkill) {
      setReadingFeedback('Reading mini-cloze unavailable for this card.');
      setReadingResults([]);
      return;
    }

    setReadingLoading(true);
    try {
      const responses = readingSkill.blanks.map((blank) => ({
        id: blank.id,
        response: readingResponses[blank.id] ?? '',
      }));

      const response = await fetch('/api/reading/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word_id: wordId,
          item_type: currentItem.card.type,
          passage: readingSkill.passage,
          blanks: readingSkill.blanks,
          responses,
        }),
      });

      const payloadJson = (await response.json().catch(() => ({}))) as {
        error?: string;
        results?: Array<{ id: string; label: string; expected: string; response: string; correct: boolean }>;
        feedback?: string;
        reading_attempts?: number;
        score?: number;
      };

      if (!response.ok) {
        throw new Error(payloadJson.error ?? 'Failed to evaluate reading');
      }

      const payload = payloadJson;

      setReadingResults(Array.isArray(payload.results) ? payload.results : []);
      setReadingFeedback(payload.feedback ?? 'Attempt recorded.');
      if (typeof payload.reading_attempts === 'number') {
        setSkillOverrides((prev) => ({
          ...prev,
          [wordId]: { ...prev[wordId], reading: payload.reading_attempts },
        }));
      }
    } catch (error) {
      console.error('[TodayReviewsPanel] reading eval error', error);
      setReadingFeedback(error instanceof Error ? error.message : 'Reading evaluation failed.');
      setReadingResults([]);
    } finally {
      setReadingLoading(false);
    }
  }, [currentItem, readingResponses]);

  const handleReveal = useCallback(() => {
    setRevealed(true);
  }, []);

  const headerSubtitle = useMemo(() => {
    if (loading) return 'Loading review queue…';
    if (!data) return 'No reviews loaded yet';
    if (data.totals.overall === 0) return 'All caught up for now!';
    return `${data.totals.overall} due for review`;
  }, [data, loading]);

  const renderCard = useCallback(
    (item: ReviewQueueEnvelope) => {
      const { card, queue } = item;
      const dueDate = new Date(queue.due_at);
      const dueLabel = isNaN(dueDate.getTime()) ? null : dueDate.toLocaleString();
      const wordId = resolveWordId(item);
      const skills = card.skills;
      const overrides = wordId ? skillOverrides[wordId] : undefined;

      const getAttempts = (skill: SkillKey) => {
        const base =
          skill === 'reading'
            ? skills?.reading?.attempts
            : skill === 'writing'
            ? skills?.writing?.attempts
            : skill === 'listening'
            ? skills?.listening?.attempts
            : skills?.speaking?.attempts;
        return overrides?.[skill] ?? (base ?? 0);
      };

      const skillsRibbon = skills ? (
        <div className="space-y-3 rounded-xl border border-border/50 bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Icon name="Sparkles" size={14} aria-hidden />
            Use it in all 4
            <span className="text-[10px] font-normal text-muted-foreground/80">
              {(skills.totalExercises ?? 10)} micro-drills
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {SKILL_SEQUENCE.map((skill) => (
              <SkillProgressRing
                key={skill}
                label={SKILL_LABELS[skill]}
                attempts={getAttempts(skill)}
                target={SKILL_TARGETS[skill]}
              />
            ))}
          </div>
        </div>
      ) : null;

      let baseContent: React.ReactNode = null;

      if (card.type === 'word') {
        const word = card.word;
        const topics = Array.isArray(word?.ielts_topics) ? word?.ielts_topics ?? [] : [];
        const feedbackTone = pronSuccess === null
          ? 'text-muted-foreground'
          : pronSuccess
          ? 'text-success'
          : 'text-orange-500';
        baseContent = (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" size="sm">
                Word
              </Badge>
              {word?.pos && <Badge size="sm">{word.pos.toUpperCase()}</Badge>}
              {word?.cefr && (
                <Badge variant="info" size="sm">
                  {word.cefr}
                </Badge>
              )}
              {word?.register && (
                <Badge variant="neutral" size="sm">
                  {word.register}
                </Badge>
              )}
              {topics.map((topic) => (
                <Badge key={`topic-${topic}`} variant="neutral" size="sm">
                  #{topic}
                </Badge>
              ))}
            </div>
            <div>
              <h3 className="text-h3 font-semibold text-foreground">{word?.headword ?? 'Vocabulary item'}</h3>
              <p className="mt-2 text-body text-muted-foreground">{word?.definition ?? 'Definition pending.'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AudioPlayButton
                audio={word?.audio ?? undefined}
                label="Play pronunciation"
                onPlay={(url) => void handleListeningAttempt(item, url)}
              />
              <Button
                type="button"
                variant="soft"
                tone="primary"
                size="sm"
                onClick={() => void handlePronunciation(item)}
                disabled={pronListening}
                className="rounded-ds-xl"
                leadingIcon={<Icon name={pronListening ? 'MicOff' : 'Mic'} aria-hidden />}
              >
                {pronListening ? 'Listening…' : 'Check pronunciation'}
              </Button>
            </div>
            {pronFeedback && (
              <p className={`text-sm ${feedbackTone}`}>{pronFeedback}</p>
            )}
            {dueLabel && <p className="text-xs text-muted-foreground">Due since {dueLabel}</p>}
          </div>
        );
      } else if (card.type === 'collocation') {
        const collocation = card.collocation;
        const headword = card.word?.headword;
        const prompt = collocation?.chunk
          ? maskCollocationChunk(collocation.chunk, headword)
          : 'Collocation prompt';
        const primaryTopic =
          card.examples?.find((example) => example.ielts_topic)?.ielts_topic ??
          card.word?.ielts_topics?.[0] ??
          null;
        baseContent = (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent" size="sm">
                Collocation
              </Badge>
              {collocation?.pattern && <Badge size="sm">{collocation.pattern}</Badge>}
              {primaryTopic && (
                <Badge size="sm" variant="neutral">
                  #{primaryTopic}
                </Badge>
              )}
            </div>
            <div>
              <h3 className="text-h3 font-semibold text-foreground">
                {revealed
                  ? highlightHeadword(collocation?.chunk ?? 'Collocation prompt', headword)
                  : prompt}
              </h3>
              {revealed && collocation?.note && (
                <p className="mt-2 text-body text-muted-foreground">{collocation.note}</p>
              )}
            </div>
            {card.word?.headword && (
              <p className="text-xs text-muted-foreground">Linked headword: {card.word.headword}</p>
            )}
            {revealed && card.examples && card.examples.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Context examples
                </p>
                <ul className="space-y-1 text-body text-muted-foreground">
                  {card.examples.map((example) => (
                    <li
                      key={example.id}
                      className="leading-snug flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span>
                        {example.text}
                        {example.ielts_topic && (
                          <span className="ml-2 text-[11px] uppercase tracking-wide text-foreground/60">
                            #{example.ielts_topic}
                          </span>
                        )}
                      </span>
                      <AudioPlayButton
                        audio={example.audio ?? undefined}
                        label="Play"
                        onPlay={(url) => void handleListeningAttempt(item, url)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {dueLabel && <p className="text-xs text-muted-foreground">Due since {dueLabel}</p>}
          </div>
        );
      } else {
        const example = card.example;
        const gapTopic = example?.ielts_topic ?? card.word?.ielts_topics?.[0];
        const gapPrompt = example?.text ?? 'Example coming soon.';
        const solution = card.word?.headword;
        const revealedText = solution
          ? gapPrompt.replace(/_{3,}/g, solution)
          : gapPrompt;
        baseContent = (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" size="sm">
                Gap
              </Badge>
              {example?.source && <Badge size="sm">{example.source.replace(/_/g, ' ')}</Badge>}
              {gapTopic && (
                <Badge size="sm" variant="neutral">
                  #{gapTopic}
                </Badge>
              )}
            </div>
            <div>
              <h3 className="text-h4 font-semibold text-foreground">Fill in the missing word</h3>
              <p className="mt-2 whitespace-pre-line text-body text-muted-foreground">
                {revealed ? revealedText : gapPrompt}
              </p>
              {revealed && solution && (
                <p className="mt-2 text-sm font-semibold text-foreground">Answer: {solution}</p>
              )}
            </div>
            <AudioPlayButton
              audio={card.audio ?? undefined}
              label="Play example audio"
              onPlay={(url) => void handleListeningAttempt(item, url)}
            />
            {card.word?.headword && (
              <p className="text-xs text-muted-foreground">Target headword: {card.word.headword}</p>
            )}
            {dueLabel && <p className="text-xs text-muted-foreground">Due since {dueLabel}</p>}
          </div>
        );
      }

      const readingSection = skills?.reading && wordId
        ? (
            <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Reading mini-cloze</h4>
                <span className="text-xs text-muted-foreground">
                  Attempts {getAttempts('reading')} / {SKILL_TARGETS.reading}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Fill the blanks with the headword and collocations.
              </p>
              <p className="rounded-lg bg-muted/30 p-3 text-sm leading-relaxed text-foreground/80">
                {skills.reading.segments.map((segment, index) => {
                  if (segment.type === 'text') {
                    return <React.Fragment key={`reading-text-${index}`}>{segment.content}</React.Fragment>;
                  }
                  const inputId = segment.id ?? `blank-${index}`;
                  return (
                    <Input
                      key={`reading-blank-${inputId}`}
                      value={readingResponses[inputId] ?? ''}
                      onChange={(event) =>
                        setReadingResponses((prev) => ({ ...prev, [inputId]: event.target.value }))
                      }
                      placeholder={segment.placeholder}
                      className="mx-1 inline-flex w-28 min-w-[6rem]"
                    />
                  );
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="soft"
                  onClick={() => void handleReadingEval()}
                  loading={readingLoading}
                  disabled={readingLoading}
                  className="rounded-ds-xl"
                  leadingIcon={<Icon name="BookOpen" aria-hidden />}
                >
                  Check blanks
                </Button>
              </div>
              {readingFeedback && <p className="text-sm text-muted-foreground">{readingFeedback}</p>}
              {readingResults.length > 0 && (
                <ul className="space-y-1 text-xs">
                  {readingResults.map((result, idx) => (
                    <li
                      key={result.id ?? `reading-result-${idx}`}
                      className="flex items-center gap-2"
                    >
                      <Icon
                        name={result.correct ? 'Check' : 'X'}
                        size={14}
                        className={result.correct ? 'text-success' : 'text-orange-500'}
                        aria-hidden
                      />
                      <span className="text-muted-foreground">
                        {(result.label ?? `Blank ${idx + 1}`)}: you wrote “{result.response || '—'}” → expected “{result.expected}”
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        : null;

      const writingSection = skills?.writing && wordId
        ? (
            <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Writing micro-drill</h4>
                <span className="text-xs text-muted-foreground">
                  Attempts {getAttempts('writing')} / {SKILL_TARGETS.writing}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{skills.writing.prompt}</p>
              <ul className="ml-4 list-disc text-sm text-muted-foreground">
                {skills.writing.scenarios.map((scenario) => (
                  <li key={scenario}>{scenario}</li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {skills.writing.suggestedCollocations.map((chunk) => (
                  <Badge key={chunk} size="sm" variant="neutral">
                    {chunk}
                  </Badge>
                ))}
              </div>
              <Textarea
                value={writingText}
                onChange={(event) => setWritingText(event.target.value)}
                rows={3}
                placeholder="Write 1–2 sentences using the target word..."
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleWritingEval()}
                  loading={writingLoading}
                  disabled={writingLoading || writingText.trim().length === 0}
                  className="rounded-ds-xl"
                  leadingIcon={<Icon name="PenSquare" aria-hidden />}
                >
                  Evaluate writing
                </Button>
                {writingScore !== null && (
                  <span className="text-sm text-muted-foreground">{writingScore}%</span>
                )}
              </div>
              {writingFeedback && <p className="text-sm text-muted-foreground">{writingFeedback}</p>}
            </div>
          )
        : null;

      return (
        <div className="space-y-6">
          {skillsRibbon}
          {baseContent}
          {readingSection}
          {writingSection}
        </div>
      );
    },
    [
      handleListeningAttempt,
      handlePronunciation,
      handleReadingEval,
      handleWritingEval,
      pronFeedback,
      pronListening,
      pronSuccess,
      readingFeedback,
      readingLoading,
      readingResponses,
      readingResults,
      revealed,
      skillOverrides,
      writingFeedback,
      writingLoading,
      writingScore,
      writingText,
    ],
  );

  return (
    <Card className="rounded-ds-2xl border border-border/70 bg-card/70">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-h4 font-semibold text-foreground">Today&apos;s Reviews</h2>
          <p className="text-small text-muted-foreground">{headerSubtitle}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge size="sm" variant="neutral">
              Words {totals.word}
            </Badge>
            <Badge size="sm" variant="neutral">
              Collocations {totals.collocation}
            </Badge>
            <Badge size="sm" variant="neutral">
              Gaps {totals.gap}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => void loadDue(false)}
              loading={refreshing}
            >
              Refresh
            </Button>
          </div>
        </div>
        {data && (
          <LearningPathChip skillMix={data.skillMix} focusSkills={data.focusSkills} />
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 text-muted-foreground">
            <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden />
            <span className="text-small">Loading review queue…</span>
          </div>
        ) : currentItem ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-border/60 bg-background/60 p-5 shadow-inner">
              {renderCard(currentItem)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReveal}
                disabled={revealed}
                className="rounded-ds-xl"
              >
                {revealed ? 'Answer shown' : 'Reveal answer'}
              </Button>
              {EASE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant="soft"
                  tone={option.tone}
                  onClick={() => void handleGrade(option.value)}
                  loading={grading && activeEase === option.value}
                  disabled={grading || suspending}
                  className="rounded-ds-xl"
                  aria-label={`${option.label} (${option.shortcut})`}
                >
                  <span className="font-semibold">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </Button>
              ))}
              <Button
                variant="ghost"
                tone="danger"
                onClick={() => void handleSuspend()}
                disabled={grading || suspending}
                loading={suspending}
                className="rounded-ds-xl"
                leadingIcon={<Icon name="Ban" aria-hidden />}
              >
                Suspend
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Session progress: {Math.min(sessionCount, sessionGoal)} / {sessionGoal}
              </span>
              {sessionDone && (
                <span className="inline-flex items-center gap-2 text-success">
                  <Icon name="check" size={14} aria-hidden /> Completed session
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 text-muted-foreground">
            <Icon name="Sparkles" aria-hidden />
            <p className="text-small text-center">No reviews are due right now. Check back later for new cards.</p>
          </div>
        )}
      </CardContent>
      {data && data.items.length > 0 && (
        <CardFooter className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Mix: {mixSummary}</span>
          <span>Daily goal: {sessionGoal} cards</span>
        </CardFooter>
      )}
    </Card>
  );
}

export default TodayReviewsPanel;
