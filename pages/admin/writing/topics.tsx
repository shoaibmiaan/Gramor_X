// pages/admin/writing/topics.tsx
import { useState } from 'react';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import useSWR from 'swr';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Input } from '@/components/design-system/Input';
import { Textarea } from '@/components/design-system/Textarea';
import { Select } from '@/components/design-system/Select';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { useToast } from '@/components/design-system/Toaster';
import { supabaseServer } from '@/lib/supabaseServer';

const difficulties = [
  { value: 'starter', label: 'Starter (Band 4–5)' },
  { value: 'intermediate', label: 'Intermediate (Band 6–6.5)' },
  { value: 'advanced', label: 'Advanced (Band 7+)' },
] as const;

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
] as const;

export type AdminWritingTopic = {
  id: string;
  title: string;
  prompt: string;
  bandTarget: number;
  tags: string[];
  difficulty: 'starter' | 'intermediate' | 'advanced';
  archivedAt: string | null;
  updatedAt: string;
};

type TopicsResponse = { topics: AdminWritingTopic[] };

type PageProps = {
  initialTopics: AdminWritingTopic[];
};

const fetcher = (url: string) =>
  fetch(url)
    .then(async (res) => {
      if (!res.ok) throw new Error('Request failed');
      return (await res.json()) as TopicsResponse;
    })
    .catch((err) => {
      throw err instanceof Error ? err : new Error('Failed to load topics');
    });

function toTagsString(tags: string[]): string {
  return tags.join(', ');
}

function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

const emptyForm = {
  title: '',
  prompt: '',
  bandTarget: 6,
  tags: '',
  difficulty: 'starter' as AdminWritingTopic['difficulty'],
  status: 'active' as 'active' | 'archived',
};

export default function WritingTopicsAdmin({ initialTopics }: PageProps) {
  const { success, error } = useToast();
  const { data, mutate, isValidating } = useSWR<TopicsResponse>('/api/admin/writing/topics', fetcher, {
    fallbackData: { topics: initialTopics },
  });

  const topics = data?.topics ?? initialTopics;

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleEdit = (topic: AdminWritingTopic) => {
    setEditingId(topic.id);
    setForm({
      title: topic.title,
      prompt: topic.prompt,
      bandTarget: topic.bandTarget,
      tags: toTagsString(topic.tags),
      difficulty: topic.difficulty,
      status: topic.archivedAt ? 'archived' : 'active',
    });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    const payload = {
      title: form.title.trim(),
      prompt: form.prompt.trim(),
      bandTarget: Number(form.bandTarget),
      tags: parseTags(form.tags),
      difficulty: form.difficulty,
      archived: form.status === 'archived',
    };

    try {
      const res = await fetch('/api/admin/writing/topics', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to save topic');
      }

      resetForm();
      success(`Topic ${editingId ? 'updated' : 'created'}`);
      await mutate();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Could not save topic');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this topic? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/writing/topics?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to delete topic');
      }
      success('Topic deleted');
      await mutate();
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      error(err instanceof Error ? err.message : 'Could not delete topic');
    }
  };

  return (
    <>
      <Head>
        <title>Admin · Writing topics</title>
      </Head>
      <Container className="py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-h2 font-semibold text-foreground">Writing topics</h1>
          <p className="text-small text-muted-foreground">
            Manage prompts surfaced in the writing practice CMS and recommend topics based on difficulty, tags, and band targets.
          </p>
        </header>

        <Card padding="lg" className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-h4 font-semibold text-foreground">{editingId ? 'Edit topic' : 'Create topic'}</h2>
              <p className="text-small text-muted-foreground">
                Provide the full writing prompt, expected band, and discovery tags.
              </p>
            </div>
            {editingId && (
              <Button variant="ghost" onClick={resetForm} size="sm">
                Cancel editing
              </Button>
            )}
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Title"
              placeholder="Task 2 · Education funding"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
            <Textarea
              label="Prompt"
              rows={6}
              placeholder="Some people believe..."
              value={form.prompt}
              onChange={(event) => setForm((prev) => ({ ...prev, prompt: event.target.value }))}
              required
            />
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Target band"
                type="number"
                min={4}
                max={9}
                step="0.5"
                value={form.bandTarget}
                onChange={(event) => setForm((prev) => ({ ...prev, bandTarget: Number(event.target.value) }))}
                required
              />
              <Select
                label="Difficulty"
                value={form.difficulty}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, difficulty: event.target.value as AdminWritingTopic['difficulty'] }))
                }
                options={difficulties}
              />
              <Select
                label="Status"
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as 'active' | 'archived' }))}
                options={statusOptions}
              />
            </div>
            <Input
              label="Tags"
              placeholder="education, task-2, opinion"
              hint="Comma separated. These power topic suggestions."
              value={form.tags}
              onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
            />
            <div className="flex items-center gap-3">
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Create topic'}
              </Button>
              {isValidating && <span className="text-small text-muted-foreground">Refreshing…</span>}
            </div>
          </form>
        </Card>

        <Card padding="lg" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-h4 font-semibold text-foreground">All topics</h2>
              <p className="text-small text-muted-foreground">
                {topics.length} configured · click a row to edit or archive.
              </p>
            </div>
          </div>

          <div className="divide-y divide-border rounded-2xl border border-border">
            {topics.length === 0 && (
              <p className="p-6 text-center text-small text-muted-foreground">No topics yet.</p>
            )}
            {topics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => handleEdit(topic)}
                className="w-full text-left transition hover:bg-muted/40 focus:outline-none focus-visible:bg-muted/60"
              >
                <div className="flex flex-col gap-2 p-6 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body font-medium text-foreground">{topic.title}</p>
                      {topic.archivedAt && <Badge variant="neutral">Archived</Badge>}
                    </div>
                    <p className="line-clamp-2 text-small text-muted-foreground">{topic.prompt}</p>
                    <div className="flex flex-wrap gap-2">
                      {topic.tags.map((tag) => (
                        <Badge key={tag} variant="subtle">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
                    <span>Band {topic.bandTarget.toFixed(1)}</span>
                    <span className="capitalize">{topic.difficulty}</span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDelete(topic.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </Container>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = supabaseServer(ctx.req as any, ctx.res as any);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: `/login?next=${encodeURIComponent(ctx.resolvedUrl ?? '/admin/writing/topics')}`,
        permanent: false,
      },
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if ((profile?.role as string | null) !== 'admin') {
    return {
      redirect: { destination: '/404', permanent: false },
    };
  }

  const { data: topics } = await supabase
    .from('writing_topics')
    .select('id, title, prompt, band_target, tags, difficulty, archived_at, updated_at')
    .order('updated_at', { ascending: false });

  const initialTopics = (topics ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    prompt: row.prompt as string,
    bandTarget: Number(row.band_target ?? 0),
    tags: (row.tags as string[]) ?? [],
    difficulty: row.difficulty as AdminWritingTopic['difficulty'],
    archivedAt: (row.archived_at as string | null) ?? null,
    updatedAt: row.updated_at as string,
  }));

  return { props: { initialTopics } };
};
