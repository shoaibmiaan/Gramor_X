import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { Container } from '@/components/design-system/Container';
import { Input } from '@/components/design-system/Input';
import { Textarea } from '@/components/design-system/Textarea';
import { Button } from '@/components/design-system/Button';
import { Select } from '@/components/design-system/Select';
import { useToast } from '@/components/design-system/Toaster';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple choice' },
  { value: 'tfng', label: 'True / False / Not Given' },
  { value: 'short', label: 'Short answer' },
] as const;

const TFNG_OPTIONS = ['True', 'False', 'Not Given'] as const;

const MAX_OPTIONS = 6;

const defaultMcqOptions = ['', '', '', ''];

type QuestionType = (typeof QUESTION_TYPES)[number]['value'];

type QuestionDraft = {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  correctIndex: number;
  tfngAnswer: typeof TFNG_OPTIONS[number];
  shortAnswers: string;
};

type ExistingTest = {
  slug: string;
  title: string;
  difficulty: string;
  words: number | null;
  questionCount: number;
  createdAt: string | null;
};

const createQuestion = (seed: number): QuestionDraft => ({
  id: `q-${Date.now()}-${seed}`,
  type: 'mcq',
  prompt: '',
  options: [...defaultMcqOptions],
  correctIndex: 0,
  tfngAnswer: 'True',
  shortAnswers: '',
});

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
  return base || 'reading-test';
}

const AdminReadingContent: React.FC = () => {
  const [title, setTitle] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [difficulty, setDifficulty] = useState('Academic');
  const [passage, setPassage] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([createQuestion(1)]);
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [existing, setExisting] = useState<ExistingTest[]>([]);

  const { success, error: toastError } = useToast();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingList(true);
      try {
        const res = await fetch('/api/admin/reading/tests');
        if (!res.ok) throw new Error('Failed to load passages');
        const data = (await res.json()) as ExistingTest[];
        if (!cancelled) setExisting(data);
      } catch (err: any) {
        if (!cancelled) {
          toastError(err?.message ?? 'Could not load existing passages');
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [toastError]);

  const suggestedSlug = useMemo(() => slugify(customSlug || title), [customSlug, title]);

  const wordCount = useMemo(() => {
    return passage
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }, [passage]);

  const validationError = useMemo(() => {
    if (!title.trim()) return 'Title is required';
    if (!passage.trim()) return 'Passage text is required';
    for (const q of questions) {
      if (!q.prompt.trim()) return 'Every question needs a prompt';
      if (q.type === 'mcq') {
        const trimmed = q.options.map((opt) => opt.trim());
        const filled = trimmed.filter(Boolean);
        if (filled.length < 2) return 'Each MCQ must have at least two filled options';
        if (trimmed.some((opt) => !opt)) return 'Fill all MCQ options or remove the extras';
        if (!trimmed[q.correctIndex]) return 'Pick a valid correct option for each MCQ';
      }
      if (q.type === 'short') {
        const answers = q.shortAnswers
          .split(/\r?\n/)
          .map((ans) => ans.trim())
          .filter(Boolean);
        if (answers.length === 0) return 'Short-answer questions need at least one accepted answer';
      }
    }
    return null;
  }, [passage, questions, title]);

  const resetForm = () => {
    setTitle('');
    setCustomSlug('');
    setDifficulty('Academic');
    setPassage('');
    setQuestions([createQuestion(1)]);
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createQuestion(prev.length + 1)]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => (prev.length === 1 ? prev : prev.filter((q) => q.id !== id)));
  };

  const updateQuestion = (id: string, updates: Partial<QuestionDraft>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const updateOption = (id: string, index: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const next = [...q.options];
        next[index] = value;
        return { ...q, options: next };
      }),
    );
  };

  const addOption = (id: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        if (q.options.length >= MAX_OPTIONS) return q;
        return { ...q, options: [...q.options, ''] };
      }),
    );
  };

  const removeOption = (id: string, index: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        if (q.options.length <= 2) return q;
        const next = q.options.filter((_, idx) => idx !== index);
        const nextCorrect = q.correctIndex >= next.length ? 0 : q.correctIndex;
        return { ...q, options: next, correctIndex: nextCorrect };
      }),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const error = validationError;
    if (error) {
      toastError(error);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: customSlug.trim() || undefined,
        difficulty,
        passage: passage.trim(),
        questions: questions.map((q) => {
          if (q.type === 'mcq') {
            return {
              type: 'mcq' as const,
              prompt: q.prompt.trim(),
              options: q.options.map((opt) => opt.trim()),
              correctIndex: q.correctIndex,
            };
          }
          if (q.type === 'tfng') {
            return {
              type: 'tfng' as const,
              prompt: q.prompt.trim(),
              answer: q.tfngAnswer,
            };
          }
          const answers = q.shortAnswers
            .split(/\r?\n/)
            .map((ans) => ans.trim())
            .filter(Boolean);
          return {
            type: 'short' as const,
            prompt: q.prompt.trim(),
            answers,
          };
        }),
      };

      const res = await fetch('/api/admin/reading/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({ error: 'Failed to save test' }));

      if (!res.ok || json?.error) {
        toastError(json?.error ?? 'Failed to save test');
        return;
      }

      const newEntry: ExistingTest = {
        slug: json.slug,
        title: payload.title,
        difficulty,
        words: wordCount || null,
        questionCount: payload.questions.length,
        createdAt: new Date().toISOString(),
      };

      success('Reading test created');
      setExisting((prev) => [newEntry, ...prev]);
      resetForm();
    } catch (err: any) {
      toastError(err?.message ?? 'Failed to save test');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin · Reading Builder</title>
      </Head>
      <Container className="py-10">
        <div className="mb-10 space-y-2">
          <p className="text-small uppercase tracking-wide text-mutedText">Reading</p>
          <h1 className="text-3xl font-semibold">Create Reading Mock Tests</h1>
          <p className="max-w-2xl text-muted-foreground">
            Draft a passage, add comprehension questions, and publish them for students. Teachers and admins share this
            workspace.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
        >
          <div className="space-y-6">
            <section className="rounded-3xl border border-border bg-card/60 p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Passage details</h2>
              <p className="mt-1 text-small text-muted-foreground">
                Set the title, difficulty, and passage body. We auto-calculate an estimated slug and word count.
              </p>

              <div className="mt-6 space-y-4">
                <Input
                  label="Title"
                  placeholder="IELTS Reading Practice Test #1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />

                <Input
                  label="Custom slug"
                  hint={`Will be saved as “${suggestedSlug}”`}
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                />

                <Select
                  label="Difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="Academic">Academic</option>
                  <option value="General">General</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </Select>

                <Textarea
                  label="Passage text"
                  hint="Supports long-form text or Markdown."
                  value={passage}
                  onChange={(e) => setPassage(e.target.value)}
                  rows={14}
                />

                <div className="text-small text-muted-foreground">
                  <span className="font-medium text-foreground">Word count:</span> {wordCount}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card/60 p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Questions</h2>
                  <p className="mt-1 text-small text-muted-foreground">
                    Support MCQ, True/False/Not Given, and short answers. More types can be added later.
                  </p>
                </div>
                <Button type="button" variant="soft" tone="primary" size="sm" onClick={addQuestion}>
                  Add question
                </Button>
              </div>

              <div className="mt-6 space-y-6">
                {questions.map((q, index) => (
                  <div key={q.id} className="rounded-2xl border border-border/60 bg-background/50 p-5 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">Question {index + 1}</p>
                        <Select
                          className="mt-2"
                          value={q.type}
                          onChange={(e) => {
                            const nextType = e.target.value as QuestionType;
                            updateQuestion(q.id, {
                              type: nextType,
                              // reset type-specific fields
                              options: nextType === 'mcq' ? [...defaultMcqOptions] : q.options,
                              correctIndex: 0,
                              tfngAnswer: 'True',
                              shortAnswers: '',
                            });
                          }}
                          size="sm"
                        >
                          {QUESTION_TYPES.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                      {questions.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(q.id)}>
                          Remove
                        </Button>
                      )}
                    </div>

                    <Textarea
                      label="Prompt"
                      value={q.prompt}
                      onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                      size="sm"
                    />

                    {q.type === 'mcq' && (
                      <div className="mt-4 space-y-4">
                        {q.options.map((opt, optIdx) => (
                          <div
                            key={`${q.id}-opt-${optIdx}`}
                            className="rounded-xl border border-border/60 bg-card/40 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <p className="text-small font-medium text-muted-foreground">Option {String.fromCharCode(65 + optIdx)}</p>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="soft"
                                  tone={q.correctIndex === optIdx ? 'primary' : 'default'}
                                  onClick={() => updateQuestion(q.id, { correctIndex: optIdx })}
                                >
                                  {q.correctIndex === optIdx ? 'Correct answer' : 'Mark correct'}
                                </Button>
                                {q.options.length > 2 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeOption(q.id, optIdx)}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                            </div>
                            <Input
                              className="mt-3"
                              placeholder="Answer text"
                              value={opt}
                              onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                              size="sm"
                            />
                          </div>
                        ))}

                        {q.options.length < MAX_OPTIONS && (
                          <Button type="button" variant="soft" size="sm" onClick={() => addOption(q.id)}>
                            Add option
                          </Button>
                        )}
                      </div>
                    )}

                    {q.type === 'tfng' && (
                      <div className="mt-4">
                        <Select
                          label="Correct answer"
                          value={q.tfngAnswer}
                          onChange={(e) => updateQuestion(q.id, { tfngAnswer: e.target.value as QuestionDraft['tfngAnswer'] })}
                          size="sm"
                        >
                          {TFNG_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}

                    {q.type === 'short' && (
                      <Textarea
                        className="mt-4"
                        label="Accepted answers"
                        hint="One per line"
                        value={q.shortAnswers}
                        onChange={(e) => updateQuestion(q.id, { shortAnswers: e.target.value })}
                        size="sm"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <Button type="submit" loading={saving} loadingText="Saving" disabled={Boolean(validationError)}>
                  Save reading test
                </Button>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-border bg-card/60 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Existing passages</h3>
              <p className="mt-1 text-small text-muted-foreground">
                Recent passages saved to Supabase. Refresh to see updates from other teammates.
              </p>

              <div className="mt-4 space-y-3">
                {loadingList && <p className="text-small text-muted-foreground">Loading…</p>}
                {!loadingList && existing.length === 0 && (
                  <p className="text-small text-muted-foreground">No passages yet.</p>
                )}
                {!loadingList &&
                  existing.map((item) => (
                    <div
                      key={item.slug}
                      className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3 text-small"
                    >
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-muted-foreground">Slug: {item.slug}</p>
                      <p className="text-muted-foreground">Difficulty: {item.difficulty}</p>
                      <p className="text-muted-foreground">
                        {item.questionCount} questions · {item.words ?? '—'} words
                      </p>
                      {item.createdAt && (
                        <p className="text-muted-foreground">
                          Created {new Date(item.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </aside>
        </form>
      </Container>
    </>
  );
};

const AdminReadingPage: React.FC = () => {
  return (
    <RoleGuard allow={['admin', 'teacher']}>
      <AdminReadingContent />
    </RoleGuard>
  );
};

export default AdminReadingPage;
