import React, { useMemo } from 'react';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';

type QType = 'mcq' | 'gap' | 'match';

type MatchPair = [number, number];
type AnswerValue = string | MatchPair[];

type McqQuestion = {
  qno: number;
  type: 'mcq';
  prompt?: string;
  options?: string[];
  answer_key: { value: string };
};

type GapQuestion = {
  qno: number;
  type: 'gap';
  prompt?: string;
  answer_key: { text: string };
};

type MatchQuestion = {
  qno: number;
  type: 'match';
  prompt?: string;
  match_left?: string[];
  match_right?: string[];
  answer_key: { pairs: MatchPair[] };
};

type Question = McqQuestion | GapQuestion | MatchQuestion;

type Answer =
  | { qno: number; answer: AnswerValue | null }
  | { qno: number; value?: string; text?: string; pairs?: MatchPair[] }; // tolerates older shapes

type AnswerMap = Record<number, AnswerValue | null>;

type Props = {
  questions: Question[];
  answers: Answer[] | AnswerMap;
  className?: string;
};

function toMap(answers: Props['answers']): AnswerMap {
  if (Array.isArray(answers)) {
    const m: AnswerMap = {};
    for (const a of answers) {
      if ('answer' in a) {
        m[a.qno] = a.answer ?? null;
      } else {
        m[a.qno] = a.value ?? a.text ?? a.pairs ?? null;
      }
    }
    return m;
  }
  return answers || {};
}

// ------- Normalizers & comparers -------
const normText = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()"]/g, '');

function isCorrect(q: Question, user: AnswerValue | null) {
  if (user == null) return false;

  if (q.type === 'mcq') {
    const want = String(q.answer_key.value ?? '').trim().toUpperCase();
    const got = String(user).trim().toUpperCase();
    return want !== '' && got === want;
  }

  if (q.type === 'gap') {
    const want = normText(q.answer_key.text);
    const got = normText(user);
    return want !== '' && got === want;
  }

  // match: compare normalized pairs (sorted)
  if (q.type === 'match') {
    const wantPairs: MatchPair[] = (q.answer_key.pairs ?? []).map(
      ([l, r]): MatchPair => [Number(l), Number(r)]
    );
    const gotPairs: MatchPair[] = Array.isArray(user)
      ? (user as MatchPair[]).map(([l, r]) => [Number(l), Number(r)] as MatchPair)
      : [];
    const sort = (arr: MatchPair[]) =>
      [...arr]
        .map(([l, r]) => [l, r] as MatchPair)
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const a = JSON.stringify(sort(wantPairs));
    const b = JSON.stringify(sort(gotPairs));
    return a === b && wantPairs.length > 0;
  }

  return false;
}

function formatAnswer(q: Question, val: AnswerValue | null): string {
  if (val == null) return '—';
  if (q.type === 'mcq') return String(val).toUpperCase();
  if (q.type === 'gap') return String(val);
  if (q.type === 'match') {
    const pairs: MatchPair[] = Array.isArray(val)
      ? (val as MatchPair[]).map(([l, r]) => [Number(l), Number(r)] as MatchPair)
      : [];
    return pairs.map(([l, r]) => `${l}→${r}`).join(', ');
  }
  return String(val);
}

function correctValue(q: Question): AnswerValue {
  if (q.type === 'mcq') return q.answer_key.value ?? '';
  if (q.type === 'gap') return q.answer_key.text ?? '';
  if (q.type === 'match') return q.answer_key.pairs ?? [];
  return '';
}

type RowResult = {
  q: Question;
  user: AnswerValue | null;
  correct: AnswerValue;
  ok: boolean;
  unanswered: boolean;
};

export default function AnswerReview({ questions, answers, className = '' }: Props) {
  const aMap = useMemo<AnswerMap>(() => toMap(answers), [answers]);

  const rows = useMemo<RowResult[]>(() => {
    return [...questions].sort((a, b) => a.qno - b.qno).map(q => {
      const user = aMap[q.qno] ?? null;
      const correct = correctValue(q);
      const ok = isCorrect(q, user);
      const unanswered = user == null || (q.type !== 'match' && String(user).trim() === '');

      return {
        q,
        user,
        correct,
        ok,
        unanswered,
      };
    });
  }, [questions, aMap]);

  const totals = useMemo<{ correct: number; total: number }>(() => {
    const correct = rows.filter(r => r.ok).length;
    const total = rows.length;
    return { correct, total };
  }, [rows]);

  return (
    <section className={className}>
      <Card className="card-surface p-6 rounded-ds-2xl mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-h3 font-semibold">Answer Review</h3>
          <Badge variant="primary" size="sm">
            Correct: {totals.correct} / {totals.total}
          </Badge>
        </div>
      </Card>

      <div className="grid gap-3">
        {rows.map(({ q, user, correct, ok, unanswered }) => (
          <Card key={q.qno} className="card-surface p-4 rounded-ds-2xl">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-[64px]">
                <Badge variant={ok ? 'primary' : unanswered ? 'warning' : 'danger'} size="sm">
                  Q{q.qno} {ok ? 'Correct' : unanswered ? 'Unanswered' : 'Incorrect'}
                </Badge>
              </div>

              <div className="flex-1">
                {q.prompt && (
                  <div className="text-body mb-2">
                    <span className="opacity-70">Prompt:</span> {q.prompt}
                  </div>
                )}

                {/* Type-specific context */}
                {q.type === 'mcq' && q.options?.length ? (
                  <div className="text-small text-muted-foreground mb-2">
                    Options: {q.options.map((opt, idx) => (
                      <span key={idx} className="inline-block mr-2">
                        <span className="font-semibold">{String.fromCharCode(65 + idx)}.</span> {opt}
                      </span>
                    ))}
                  </div>
                ) : null}

                {q.type === 'match' && (q.match_left?.length || q.match_right?.length) ? (
                  <div className="text-small text-muted-foreground mb-2">
                    <div>Left: {q.match_left?.join(', ') || '—'}</div>
                    <div>Right: {q.match_right?.join(', ') || '—'}</div>
                  </div>
                ) : null}

                {/* Answers row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-small opacity-70 mr-1">Your answer:</span>
                  <Badge variant={ok ? 'primary' : unanswered ? 'warning' : 'danger'} size="sm">
                    {formatAnswer(q, user)}
                  </Badge>

                  {!ok && (
                    <>
                      <span className="text-small opacity-70 mx-2">Correct:</span>
                      <Badge variant="primary" size="sm">
                        {formatAnswer(q, correct)}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export type { Question, Answer, MatchPair };

