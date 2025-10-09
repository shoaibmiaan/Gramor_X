import React, { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { Container } from '@/components/design-system/Container';
import { Input } from '@/components/design-system/Input';
import { Textarea } from '@/components/design-system/Textarea';
import { Button } from '@/components/design-system/Button';
import { useToast } from '@/components/design-system/Toaster';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface QuestionDraft {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

interface UploadResult {
  path: string;
  url: string | null;
  mime: string;
  originalName: string;
}

interface ExistingTest {
  slug: string;
  title: string;
  duration?: number;
}

const makeQuestion = (seed: number): QuestionDraft => ({
  id: `q-${Date.now()}-${seed}`,
  prompt: '',
  options: ['', '', '', ''],
  correctIndex: 0,
});

const toSentenceCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const AdminListeningContent: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [audio, setAudio] = useState<UploadResult | null>(null);
  const [questions, setQuestions] = useState<QuestionDraft[]>([makeQuestion(1)]);
  const [existingTests, setExistingTests] = useState<ExistingTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoadingTests(true);
    fetch('/api/listening/tests')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load tests');
        return (await res.json()) as ExistingTest[];
      })
      .then((data) => {
        if (!cancelled) setExistingTests(data);
      })
      .catch(() => {
        if (!cancelled) {
          toastError('Could not load existing tests');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTests(false);
      });

    return () => {
      cancelled = true;
    };
  }, [toastError]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setAudioError(null);

    try {
      const form = new FormData();
      form.append('file', file);
      if (title) form.append('title', title);

      const res = await fetch('/api/admin/listening/upload', {
        method: 'POST',
        body: form,
      });

      const payload = await res.json().catch(() => ({ error: 'Upload failed' }));

      if (!res.ok || payload?.error) {
        setAudio(null);
        toastError(payload?.error ?? 'Upload failed');
      } else {
        setAudio({
          path: payload.path,
          url: payload.publicUrl ?? payload.path ?? null,
          mime: payload.mime,
          originalName: file.name,
        });
        success('Audio uploaded successfully');
      }
    } catch (err: any) {
      setAudio(null);
      toastError(err?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, makeQuestion(prev.length + 1)]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((q) => q.id !== id)));
  };

  const updatePrompt = (id: string, prompt: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, prompt } : q)));
  };

  const updateOption = (id: string, index: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const options = [...q.options];
        options[index] = value;
        return { ...q, options };
      }),
    );
  };

  const setCorrectOption = (id: string, index: number) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, correctIndex: index } : q)));
  };

  const hasValidationErrors = useMemo(() => {
    if (!title.trim()) return 'Title is required';
    if (!audio?.url) return 'Upload an audio file';
    for (const q of questions) {
      if (!q.prompt.trim()) return 'All questions need a prompt';
      if (q.options.some((opt) => !opt.trim())) return 'All options must be filled';
      if (q.correctIndex >= q.options.length) return 'Mark a correct option for each question';
    }
    return null;
  }, [audio?.url, questions, title]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAudio(null);
    setQuestions([makeQuestion(1)]);
    setAudioError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = hasValidationErrors;
    if (validationError) {
      setAudioError(validationError === 'Upload an audio file' ? validationError : null);
      toastError(validationError);
      return;
    }

    if (!audio?.url) {
      toastError('Upload an audio file before saving');
      return;
    }

    const trimmedTitle = title.trim();

    setCreating(true);
    try {
      const res = await fetch('/api/admin/listening/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          audioUrl: audio.url,
          storagePath: audio.path,
          description: description.trim() || undefined,
          questions: questions.map((q) => ({
            prompt: q.prompt.trim(),
            options: q.options.map((opt) => opt.trim()),
            correctOption: q.correctIndex,
          })),
        }),
      });

      const payload = await res.json().catch(() => ({ error: 'Failed to create test' }));

      if (!res.ok || payload?.error) {
        toastError(payload?.error ?? 'Failed to create test');
      } else {
        success('Listening test created');
        resetForm();
        setExistingTests((prev) => [
          { slug: payload.slug, title: trimmedTitle },
          ...prev,
        ]);
      }
    } catch (err: any) {
      toastError(err?.message ?? 'Failed to create test');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin · Listening Tests</title>
      </Head>
      <Container className="py-10">
        <div className="mb-10 flex flex-col gap-2">
          <p className="text-small uppercase tracking-wide text-muted-foreground">Listening</p>
          <h1 className="text-3xl font-semibold">Create Listening Mock Tests</h1>
          <p className="max-w-2xl text-muted-foreground">
            Upload audio tracks and craft question sets for new listening practice tests. Only admins can
            access this workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-border bg-card/60 p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Test details</h2>
              <p className="mt-1 text-small text-muted-foreground">
                Give the test a clear, student-friendly title. Audio uploads are stored in Supabase Storage.
              </p>

              <div className="mt-6 space-y-4">
                <Input
                  label="Title"
                  placeholder="IELTS Listening Practice Test #5"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <Textarea
                  label="Internal notes"
                  hint="Optional helper text for other admins (not shown to students)."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  variant="subtle"
                  size="sm"
                />

                <div>
                  <label className="mb-1 block text-small font-medium text-muted-foreground">Audio file</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="block w-full cursor-pointer rounded-xl border border-dashed border-border bg-background px-4 py-3 text-small text-muted-foreground"
                  />
                  <div className="mt-2 min-h-[1.25rem] text-small text-muted-foreground">
                    {uploading && <span>Uploading…</span>}
                    {!uploading && audio?.url && (
                      <span className="text-success">
                        Uploaded {audio.originalName} ({audio.mime.split('/')[1] || audio.mime})
                      </span>
                    )}
                    {!uploading && !audio?.url && audioError && (
                      <span className="text-sunsetOrange">{audioError}</span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card/60 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Questions</h2>
                  <p className="mt-1 text-small text-muted-foreground">
                    Start with multiple-choice questions. Each prompt should align with the uploaded track.
                  </p>
                </div>
                <Button type="button" variant="soft" tone="primary" size="sm" onClick={addQuestion}>
                  Add question
                </Button>
              </div>

              <div className="mt-6 space-y-6">
                {questions.map((q, index) => (
                  <div key={q.id} className="rounded-2xl border border-border bg-background/50 p-5 shadow-sm">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">Question {index + 1}</p>
                        <p className="text-xs text-muted-foreground/80">Multiple choice</p>
                      </div>
                      {questions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(q.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    <Textarea
                      label="Prompt"
                      placeholder="What is the purpose of the speaker's visit?"
                      value={q.prompt}
                      onChange={(e) => updatePrompt(q.id, e.target.value)}
                      size="sm"
                    />

                    <div className="mt-4 grid gap-3">
                      {q.options.map((opt, optIdx) => (
                        <div key={`${q.id}-${optIdx}`} className="rounded-xl border border-border/60 bg-card/40 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-small font-medium text-muted-foreground">
                              Option {LETTERS[optIdx] ?? toSentenceCase(String(optIdx + 1))}
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              variant="soft"
                              tone={q.correctIndex === optIdx ? 'primary' : 'default'}
                              onClick={() => setCorrectOption(q.id, optIdx)}
                            >
                              {q.correctIndex === optIdx ? 'Correct option' : 'Mark correct'}
                            </Button>
                          </div>
                          <Input
                            className="mt-3"
                            placeholder="Answer text"
                            value={opt}
                            onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex justify-end">
              <Button type="submit" loading={creating} loadingText="Saving" disabled={Boolean(hasValidationErrors)}>
                Save listening test
              </Button>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-border bg-card/60 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Existing tests</h3>
              <p className="mt-1 text-small text-muted-foreground">
                Quick reference list pulled from Supabase. Refresh to see new entries from other admins.
              </p>

              <div className="mt-4 space-y-3">
                {loadingTests && <p className="text-small text-muted-foreground">Loading…</p>}
                {!loadingTests && existingTests.length === 0 && (
                  <p className="text-small text-muted-foreground">No listening tests found.</p>
                )}
                {!loadingTests &&
                  existingTests.map((test) => (
                    <div
                      key={test.slug}
                      className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3 text-small"
                    >
                      <p className="font-medium text-foreground">{test.title}</p>
                      <p className="text-muted-foreground">Slug: {test.slug}</p>
                      {typeof test.duration === 'number' && test.duration > 0 && (
                        <p className="text-muted-foreground">Duration: {test.duration} sec</p>
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

const AdminListeningPage: React.FC = () => {
  return (
    <RoleGuard allow="admin">
      <AdminListeningContent />
    </RoleGuard>
  );
};

export default AdminListeningPage;
