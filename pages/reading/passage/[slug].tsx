import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { env } from '@/lib/env';
import {
  useReadingAnswers,
  type AnswerValue,
} from '@/components/reading/useReadingAnswers';
import { QuestionRenderer } from '@/components/reading/QuestionRenderer';
import { ReadingFilterBar } from '@/components/reading/ReadingFilterBar';

type QKind = 'tfng' | 'mcq' | 'matching' | 'short';

type Question = {
  id: string;
  order_no: number;
  kind: QKind;
  prompt: string;
  options: any;   // jsonb
  answers: AnswerValue | AnswerValue[];   // jsonb
  points: number | null;
};

type Props = {
  slug: string;
  title: string;
  difficulty: 'Academic' | 'General';
  words: number | null;
  content: string;
  questions: Question[];
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = String(ctx.params?.slug ?? '');
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } } // Ensured for server
  );

  const [{ data: passage }, { data: qRows }] = await Promise.all([
    supabase
      .from('reading_passages')
      .select('slug,title,difficulty,words,content')
      .eq('slug', slug)
      .single(),
    supabase
      .from('reading_questions')
      .select('id,order_no,kind,prompt,options,answers,points')
      .eq('passage_slug', slug)
      .order('order_no', { ascending: true }),
  ]);

  if (!passage || !qRows?.length) return { notFound: true };

  return {
    props: {
      slug: passage.slug,
      title: passage.title,
      difficulty: (passage.difficulty as any) ?? 'Academic',
      words: (passage.words as any) ?? null,
      content: passage.content,
      questions: qRows as Question[],
    },
  };
};

export default function ReadingRunner({ slug, title, difficulty, words, content, questions }: Props) {
  const router = useRouter();
  const store = useReadingAnswers(slug);
  const [sec, setSec] = useState(60 * 30); // 30 minutes
  const [submitting, setSubmitting] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  // -------- Timer --------
  useEffect(() => {
    const t = setInterval(() => setSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const hhmmss = (n: number) => {
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    const s = n % 60;
    return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
  };

  const maxPts = useMemo(() => questions.reduce((s, q) => s + (q.points ?? 1), 0), [questions]);

  const typeFilter = (router.query.type as QKind | 'all') || 'all';
  const filtered = useMemo(() => {
    if (typeFilter === 'all') return questions;
    return questions.filter((q) => q.kind === typeFilter);
  }, [questions, typeFilter]);

  useEffect(() => {
    if (!filtered.length) {
      setActiveIdx(0);
      return;
    }
    setActiveIdx((idx) => Math.min(idx, filtered.length - 1));
  }, [filtered]);

  const questionIds = useMemo(() => filtered.map((q) => q.id), [filtered]);

  const scrollToQuestion = useCallback((idx: number) => {
    const id = questionIds[idx];
    if (!id) return;
    const el = document.getElementById(`reading-question-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [questionIds]);

  const goPrev = useCallback(() => {
    setActiveIdx((idx) => {
      const next = Math.max(0, idx - 1);
      if (next !== idx) scrollToQuestion(next);
      return next;
    });
  }, [scrollToQuestion]);

  const goNext = useCallback(() => {
    setActiveIdx((idx) => {
      const next = Math.min(questionIds.length - 1, idx + 1);
      if (next !== idx) scrollToQuestion(next);
      return next;
    });
  }, [questionIds, scrollToQuestion]);

  // -------- Submit --------
  const isAnswered = useCallback((value: AnswerValue | undefined) => {
    if (value == null) return false;
    if (Array.isArray(value)) return value.some((v) => v != null && v !== '');
    if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some((v) => v != null && v !== '');
    if (typeof value === 'boolean') return true;
    return value !== '';
  }, []);

  const answeredCount = useMemo(
    () => Object.values(store.answers).filter((val) => isAnswered(val as AnswerValue | undefined)).length,
    [isAnswered, store.answers],
  );

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        // Prevent 401 by checking session
        console.error('No session for submit');
        return;
      }
      const token = session?.access_token ?? '';

      const r = await fetch('/api/reading/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          passageSlug: slug,
          answers: store.answers,
          durationMs: (60 * 30 - sec) > 0 ? (60 * 30 - sec) * 1000 : null,
        }),
      });

      const json = await r.json();
      if (json?.attemptId) {
        store.clear();
        window.location.href = `/reading/${encodeURIComponent(slug)}/review?attemptId=${json.attemptId}`;
      } else if (json?.score) {
        alert(`Score: ${json.score.correct} / ${json.score.total}`);
      } else {
        alert('Submit failed. Please try again.');
      }
    } catch (err) {
      console.error('Reading submit failed', err);
      alert('Submit failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-24">
      <Container className="pb-24 sm:pb-0">
        {/* Header + Meta */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-h2 font-semibold">{title}</h1>
          <div className="flex items-center gap-3">
            <Badge>{difficulty}</Badge>
            {typeof words === 'number' && words > 0 && <Badge>{words} words</Badge>}
            <Badge>{questions.length} questions</Badge>
            <Badge>Max {maxPts} pts</Badge>
            <Badge>⏱ {hhmmss(sec)}</Badge>
            <Badge>Answered: {answeredCount}/{questions.length}</Badge>
          </div>
        </div>

        {/* Passage */}
        <Card className="p-6 mb-8">
          <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
            {content}
          </div>
        </Card>

        {/* Filter + Questions */}
        <ReadingFilterBar className="mb-4" />
        <div className="grid gap-4">
          {filtered.map((q, idx) => {
            const qData =
              q.kind === 'tfng'
                ? { kind: 'tfng', id: q.id, prompt: q.prompt }
                : q.kind === 'mcq'
                ? {
                    kind: 'mcq' as const,
                    id: q.id,
                    prompt: q.prompt,
                    options: Array.isArray(q.options) ? q.options : [],
                  }
                : q.kind === 'matching'
                ? {
                    kind: 'matching' as const,
                    id: q.id,
                    prompt: q.prompt,
                    pairs: Array.isArray(q.options?.pairs) ? q.options.pairs : [],
                  }
                : { kind: 'short' as const, id: q.id, prompt: q.prompt };
            return (
              <Card
                key={q.id}
                id={`reading-question-${q.id}`}
                className="p-5 scroll-mt-24"
                onFocusCapture={() => setActiveIdx(idx)}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => setActiveIdx(idx)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="font-medium">
                    <span className="text-grayish mr-2">Question {q.order_no}.</span>
                    {q.prompt}
                  </div>
                  <Badge>{q.kind.toUpperCase()}</Badge>
                </div>
                <QuestionRenderer
                  question={qData as any}
                  store={store}
                  onChange={(id, v) => store.setAnswer(id, v)}
                />
              </Card>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-8">
          <Link href="/reading" className="text-small underline">
            Back to Catalog
          </Link>
          <div className="flex gap-3">
            <Button variant="secondary" className="rounded-ds-xl" onClick={() => {/* answers persisted */}}>
              Save Draft
            </Button>
            <Button
              variant="primary"
              className="rounded-ds-xl"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </Button>
          </div>
        </div>
      </Container>
      <div className="fixed inset-x-0 bottom-0 z-20 sm:hidden">
        <div className="border-t border-lightBorder/60 bg-white/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-dark/90">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              className="flex-1 rounded-ds-xl"
              onClick={goPrev}
              disabled={activeIdx <= 0 || questionIds.length === 0}
            >
              Prev
            </Button>
            <Button
              variant="secondary"
              className="flex-1 rounded-ds-xl"
              onClick={goNext}
              disabled={activeIdx >= questionIds.length - 1 || questionIds.length === 0}
            >
              Next
            </Button>
            <Button
              variant="primary"
              className="flex-1 rounded-ds-xl"
              onClick={handleSubmit}
              disabled={submitting || questionIds.length === 0}
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}