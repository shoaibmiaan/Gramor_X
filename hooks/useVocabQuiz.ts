import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PublicQuizQuestion, QuizAnswer, StartQuizPayload } from '@/lib/services/vocabQuizService';

type SubmitResult = {
  score: { correct: number; total: number; accuracy: number; weightedAccuracy: number };
  estimatedBandImpact: { before: number; after: number; delta: number };
  strengths: string[];
  weaknesses: string[];
  recommendedNextWords: string[];
  suggestedDifficulty: 'easy' | 'medium' | 'hard';
};

type QuizError = string | null;

export function useVocabQuiz() {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<QuizError>(null);
  const [session, setSession] = useState<StartQuizPayload | null>(null);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const startAtRef = useRef<number>(0);
  const questionShownAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const submittedRef = useRef(false);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetQuiz = useCallback(() => {
    stopTimer();
    abortRef.current?.abort();
    setLoading(false);
    setSubmitting(false);
    setError(null);
    setSession(null);
    setAnswers([]);
    setResult(null);
    setCurrentQuestion(0);
    setRemainingSeconds(0);
    submittedRef.current = false;
  }, [stopTimer]);

  const submitQuiz = useCallback(async () => {
    if (!session || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError(null);

    const elapsedMs = Math.max(0, Date.now() - startAtRef.current);

    try {
      const response = await fetch('/api/quiz/vocab/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizSessionId: session.quizSessionId,
          answers,
          elapsedMs,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Unable to submit quiz.');
      }

      const payload = (await response.json()) as SubmitResult;
      setResult(payload);
      stopTimer();
    } catch (caughtError) {
      submittedRef.current = false;
      const message = caughtError instanceof Error ? caughtError.message : 'Submission failed.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [answers, session, stopTimer]);

  const startQuiz = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setResult(null);
    setAnswers([]);
    setCurrentQuestion(0);
    submittedRef.current = false;

    try {
      const response = await fetch('/api/quiz/vocab/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Unable to start quiz.');
      }

      const payload = (await response.json()) as StartQuizPayload;
      setSession(payload);
      setRemainingSeconds(payload.durationSeconds);
      startAtRef.current = Date.now();
      questionShownAtRef.current = Date.now();

      stopTimer();
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startAtRef.current) / 1000);
        const next = Math.max(0, payload.durationSeconds - elapsed);
        setRemainingSeconds(next);
      }, 300);
    } catch (caughtError) {
      if (controller.signal.aborted) return;
      const message = caughtError instanceof Error ? caughtError.message : 'Failed to start quiz';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [stopTimer]);

  const answerQuestion = useCallback((selectedIndex: number) => {
    if (!session) return;
    const question = session.questions[currentQuestion];
    if (!question) return;

    const responseTimeMs = Math.max(0, Date.now() - questionShownAtRef.current);

    setAnswers((current) => {
      const next = current.filter((entry) => entry.questionId !== question.id);
      next.push({ questionId: question.id, selectedIndex, responseTimeMs });
      return next;
    });

    const hasMore = currentQuestion < session.questions.length - 1;
    if (hasMore) {
      setCurrentQuestion((value) => value + 1);
      questionShownAtRef.current = Date.now();
    }
  }, [currentQuestion, session]);

  useEffect(() => {
    if (remainingSeconds === 0 && session && !result && !submitting && !loading) {
      void submitQuiz();
    }
  }, [loading, remainingSeconds, result, session, submitQuiz, submitting]);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const current = useMemo<PublicQuizQuestion | null>(() => {
    if (!session) return null;
    return session.questions[currentQuestion] ?? null;
  }, [currentQuestion, session]);

  return {
    loading,
    submitting,
    error,
    session,
    current,
    currentQuestion,
    totalQuestions: session?.questions.length ?? 0,
    answers,
    remainingSeconds,
    result,
    startQuiz,
    answerQuestion,
    submitQuiz,
    resetQuiz,
  } as const;
}

export default useVocabQuiz;
