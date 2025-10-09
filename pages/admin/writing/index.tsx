import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { Container } from '@/components/design-system/Container';
import { Input } from '@/components/design-system/Input';
import { Textarea } from '@/components/design-system/Textarea';
import { useToast } from '@/components/design-system/Toaster';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type WritingPrompt = {
  id: string;
  title: string;
  prompt: string;
  task_type: string | null;
  created_at: string;
};

const TASK_TYPES: Array<{ value: string; label: string }> = [
  { value: '', label: 'Uncategorized' },
  { value: 'task1', label: 'Task 1' },
  { value: 'task2', label: 'Task 2' },
  { value: 'general', label: 'General Writing' },
];

const getTaskTypeLabel = (value: string | null) => {
  const match = TASK_TYPES.find((type) => type.value === (value ?? ''));
  return match ? match.label : 'Uncategorized';
};

const AdminWritingPromptsPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [taskType, setTaskType] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState<WritingPrompt[]>([]);

  const { success, error: toastError } = useToast();

  const canSubmit = useMemo(
    () => Boolean(title.trim()) && Boolean(prompt.trim()),
    [prompt, title],
  );

  const resetForm = () => {
    setTitle('');
    setPrompt('');
    setTaskType('');
  };

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseBrowser
        .from('writing_prompts')
        .select('id, title, prompt, task_type, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setPrompts((data ?? []) as WritingPrompt[]);
    } catch (err) {
      toastError(
        err instanceof Error ? err.message : 'Could not load writing prompts',
      );
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    void loadPrompts();
  }, [loadPrompts]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      toastError('Provide a title and prompt before saving.');
      return;
    }

    setSaving(true);
    try {
      const trimmedTitle = title.trim();
      const trimmedPrompt = prompt.trim();

      const { error } = await supabaseBrowser.from('writing_prompts').insert([
        {
          title: trimmedTitle,
          prompt: trimmedPrompt,
          task_type: taskType ? taskType : null,
        },
      ]);

      if (error) throw error;

      success('Writing prompt saved');
      resetForm();
      await loadPrompts();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not save prompt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleGuard allow={['admin', 'teacher'] as any}>
      <Head>
        <title>Admin · Writing Prompts</title>
      </Head>

      <Container as="main" className="py-8 space-y-8">
        <header className="space-y-2">
          <h1 className="text-h2 font-semibold tracking-tight">
            Writing Prompts
          </h1>
          <p className="text-muted-foreground max-w-2xl text-small">
            Create new essay or chart description prompts for students. These
            prompts will be available to the grading AI and other teacher tools.
          </p>
        </header>

        <section className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-h4 font-semibold">Add a new prompt</h2>
            <p className="text-small text-muted-foreground">
              Provide a clear identifier and the full prompt text. You can
              optionally tag the task type to make discovery easier.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Prompt title"
              placeholder="e.g., Task 2 — Technology and Society"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />

            <Textarea
              label="Prompt description"
              placeholder="Paste or write the full instructions students should receive."
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={8}
              required
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-small font-medium text-muted-foreground">
                Task type
                <select
                  value={taskType}
                  onChange={(event) => setTaskType(event.target.value)}
                  className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2"
                >
                  {TASK_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end justify-end">
                <button
                  type="submit"
                  disabled={!canSubmit || saving}
                  className="h-11 rounded-xl border bg-primary px-6 text-small font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save prompt'}
                </button>
              </div>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-h4 font-semibold">Existing prompts</h2>
              <p className="text-small text-muted-foreground">
                {loading
                  ? 'Loading prompts…'
                  : prompts.length === 0
                    ? 'No prompts saved yet. New prompts will appear here.'
                    : 'Review saved prompts to avoid duplicates and plan lessons.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!loading) void loadPrompts();
              }}
              disabled={loading}
              className="h-10 rounded-xl border px-4 text-small font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          <div className="rounded-2xl border overflow-hidden">
            <table className="w-full text-small">
              <thead className="bg-muted/60">
                <tr>
                  <th className="text-left p-3">Title</th>
                  <th className="text-left p-3">Task type</th>
                  <th className="text-left p-3">Prompt</th>
                  <th className="text-left p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {prompts.map((item) => (
                  <tr key={item.id} className="border-t align-top">
                    <td className="p-3 font-medium">{item.title}</td>
                    <td className="p-3 capitalize">{getTaskTypeLabel(item.task_type)}</td>
                    <td className="p-3">
                      <details>
                        <summary className="cursor-pointer select-none text-muted-foreground">
                          Show prompt
                        </summary>
                        <p className="mt-2 whitespace-pre-wrap text-foreground">
                          {item.prompt}
                        </p>
                      </details>
                    </td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : '—'}
                    </td>
                  </tr>
                ))}
                {prompts.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      No writing prompts have been saved yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </Container>
    </RoleGuard>
  );
};

export default AdminWritingPromptsPage;

