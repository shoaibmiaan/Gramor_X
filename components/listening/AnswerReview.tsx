import React, { useMemo } from 'react';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';

type QType = 'mcq' | 'gap' | 'match';

type Question = {
  qno: number;
  type: QType;
  prompt?: string;
  options?: string[];          // mcq
  match_left?: string[];       // match
  match_right?: string[];      // match
  answer_key: any;             // { value:'A' } | { text:'apple' } | { pairs:[ [1,3], [2,4] ] }
};

type Answer =
  | { qno: number; answer: any }
  | { qno: number; value?: any; text?: any; pairs?: [number, number][] }; // tolerates older shapes

type Props = {
  questions: Question[];
  answers: Answer[] | Record<number, any>;
  className?: string;
};

function toMap(answers: Props['answers']): Record<number, any> {
  if (Array.isArray(answers)) {
    const m: Record<number, any> = {};
    for (const a of answers) {
      const anyA = a as any;
      m[anyA.qno] = anyA.answer ?? anyA.value ?? anyA.text ?? anyA.pairs ?? null;
    }
    return m;
  }
  return answers || {};
}

// ------- Normalizers & comparers -------
const normText = (s: any) =>
  String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()"]/g, '');

function isCorrect(q: Question, user: any) {
  if (user == null) return false;

  if (q.type === 'mcq') {
    const want = String(q.answer_key?.value ?? '').trim().toUpperCase();
    const got = String(user).trim().toUpperCase();
    return want && got === want;
  }

  if (q.type === 'gap') {
    const want = normText(q.answer_key?.text);
    const got = normText(user);
    return want && got === want;
  }

  // match: compare normalized pairs (sorted)
  if (q.type === 'match') {
    const wantPairs: [number, number][] = (q.answer_key?.pairs ?? []).map((p: any) => [Number(p[0]), Number(p[1])]);
    const gotPairs: [number, number][] = (user ?? []).map((p: any) => [Number(p[0]), Number(p[1])]);
    const sort = (arr: [number, number][]) =>
      [...arr].map(([l, r]) => [l, r] as [number, number]).sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
    const a = JSON.stringify(sort(wantPairs));
    const b = JSON.stringify(sort(gotPairs));
    return a === b && wantPairs.length > 0;
  }

  return false;
}

function formatAnswer(q: Question, val: any): string {
  if (val == null) return '—';
  if (q.type === 'mcq') return String(val).toUpperCase();
  if (q.type === 'gap') return String(val);
  if (q.type === 'match') {
    const pairs: [number, number][] = (val ?? []).map((p: any) => [Number(p[0]), Number(p[1])]);
    return pairs.map(([l, r]) => `${l}→${r}`).join(', ');
  }
  return String(val);
}

function correctValue(q: Question): any {
  if (q.type === 'mcq') return q.answer_key?.value ?? '';
  if (q.type === 'gap') return q.answer_key?.text ?? '';
  if (q.type === 'match') return q.answer_key?.pairs ?? [];
  return '';
}

export default function AnswerReview({ questions, answers, className = '' }: Props) {
  const aMap = useMemo(() => toMap(answers), [answers]);

  const rows = useMemo(() => {
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

  const totals = useMemo(() => {
    const correct = rows.filter(r => r.ok).length;
    const total = rows.length;
    return { correct, total };
  }, [rows]);

  return (
    <section className={className}>
      <Card className="card-surface p-6 rounded-ds-2xl mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-h3 font-semibold">Answer Review</h3>
          <Badge variant="info" size="sm">
            Correct: {totals.correct} / {totals.total}
          </Badge>
        </div>
      </Card>

      <div className="grid gap-3">
        {rows.map(({ q, user, correct, ok, unanswered }) => (
          <Card key={q.qno} className="card-surface p-4 rounded-ds-2xl">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-[64px]">
                <Badge variant={ok ? 'success' : unanswered ? 'warning' : 'danger'} size="sm">
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
                  <Badge variant={ok ? 'success' : unanswered ? 'warning' : 'danger'} size="sm">
                    {formatAnswer(q, user)}
                  </Badge>

                  {!ok && (
                    <>
                      <span className="text-small opacity-70 mx-2">Correct:</span>
                      <Badge variant="success" size="sm">
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
