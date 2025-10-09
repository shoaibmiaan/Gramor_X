import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Input } from '@/components/design-system/Input';
import { Textarea } from '@/components/design-system/Textarea';
import { Button } from '@/components/design-system/Button';
import { Select } from '@/components/design-system/Select';
import { useToast } from '@/components/design-system/Toaster';

type PromptRow = {
  id: string;
  title: string | null;
  prompt: string;
  part_type: string | null;
  estimated_minutes: number | null;
  created_at: string;
};

type PartOption = 'general' | 'part1' | 'part2' | 'part3';

const PART_OPTIONS: { value: PartOption; label: string }[] = [
  { value: 'general', label: 'General / Unspecified' },
  { value: 'part1', label: 'Part 1 — Interview' },
  { value: 'part2', label: 'Part 2 — Long Turn' },
  { value: 'part3', label: 'Part 3 — Discussion' },
];

const mapPartLabel = (value: string | null | undefined) => {
  const match = PART_OPTIONS.find((opt) => opt.value === (value ?? ''));
  if (match) return match.label;
  return value ? value : 'General';
};

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const AdminSpeakingPrompts: React.FC = () => {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [partType, setPartType] = useState<PartOption>('general');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<PromptRow[]>([]);

  const { success, error: toastError } = useToast();

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/speaking/prompts');
      const payload = await res.json().catch(() => ({ error: 'Failed to parse response' }));
      if (!res.ok || payload?.error) {
        throw new Error(payload?.error || 'Failed to load prompts');
      }
      setPrompts(Array.isArray(payload?.prompts) ? payload.prompts : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load prompts';
      toastError(message);
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    void fetchPrompts();
  }, [fetchPrompts]);

  const disableSubmit = useMemo(() => {
    if (!title.trim()) return true;
    if (!prompt.trim()) return true;
    if (saving) return true;
    if (estimatedMinutes) {
      const value = Number.parseInt(estimatedMinutes, 10);
      if (Number.isNaN(value) || value < 0 || value > 60) {
        return true;
      }
    }
    return false;
  }, [estimatedMinutes, prompt, saving, title]);

  const resetForm = () => {
    setTitle('');
    setPrompt('');
    setPartType('general');
    setEstimatedMinutes('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disableSubmit) return;

    setSaving(true);
    try {
      const minutes = estimatedMinutes ? Number.parseInt(estimatedMinutes, 10) : undefined;
      const res = await fetch('/api/admin/speaking/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          prompt: prompt.trim(),
          partType,
          estimatedMinutes: typeof minutes === 'number' && !Number.isNaN(minutes) ? minutes : undefined,
        }),
      });

      const payload = await res.json().catch(() => ({ error: 'Failed to parse response' }));
      if (!res.ok || payload?.error) {
        throw new Error(payload?.error || 'Failed to save prompt');
      }

      success('Prompt saved');
      resetForm();
      await fetchPrompts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save prompt';
      toastError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="py-20 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90 min-h-screen">
      <Container className="space-y-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="font-slab text-display text-gradient-primary">Speaking Prompts</h1>
            <p className="text-grayish max-w-2xl text-small leading-relaxed">
              Teachers and admins can add new IELTS speaking prompts here. Every prompt is saved to Supabase and
              becomes available to the simulator and lesson planning tools immediately.
            </p>
          </div>
          <Button
            href="/admin/speaking/attempts"
            variant="secondary"
            size="md"
            className="self-start md:self-center"
          >
            Review speaking attempts (admins)
          </Button>
        </div>

        <Card className="rounded-ds-2xl p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-1">Add a new prompt</h2>
            <p className="text-sm text-muted-foreground">
              Provide a short title, the actual speaking prompt, and optional metadata.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Prompt title"
              placeholder="e.g. Describe your favourite teacher"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />

            <Textarea
              label="Prompt text"
              placeholder="Describe a time when..."
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={6}
              required
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Part type"
                value={partType}
                onChange={(event) => setPartType(event.target.value as PartOption)}
              >
                {PART_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <Input
                label="Estimated time (minutes)"
                type="number"
                min={0}
                max={60}
                step={1}
                placeholder="Optional"
                value={estimatedMinutes}
                onChange={(event) => setEstimatedMinutes(event.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={disableSubmit} loading={saving}>
                Save prompt
              </Button>
              <Button type="button" variant="ghost" onClick={resetForm} disabled={saving}>
                Reset
              </Button>
            </div>
          </form>
        </Card>

        <Card className="rounded-ds-2xl p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
            <div>
              <h2 className="text-lg font-semibold">Existing prompts</h2>
              <p className="text-sm text-muted-foreground">
                Showing the {prompts.length} most recent prompts.
              </p>
            </div>
            <Button variant="secondary" onClick={fetchPrompts} disabled={loading}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="p-6">
              <div className="animate-pulse h-5 w-48 bg-muted rounded mb-3" />
              <div className="animate-pulse h-5 w-full bg-muted rounded mb-2" />
              <div className="animate-pulse h-5 w-5/6 bg-muted rounded" />
            </div>
          ) : prompts.length === 0 ? (
            <div className="px-6 py-10 text-center text-muted-foreground text-sm">
              No prompts saved yet. Start by creating one above.
            </div>
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/10">
              {prompts.map((row) => (
                <li key={row.id} className="px-6 py-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {row.title || 'Untitled prompt'}
                      </h3>
                      <p className="text-sm text-muted-foreground">{mapPartLabel(row.part_type)}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(row.created_at)}</div>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                    {row.prompt}
                  </p>
                  {typeof row.estimated_minutes === 'number' && row.estimated_minutes >= 0 && (
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Estimated time: {row.estimated_minutes} min
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Container>
    </section>
  );
};

export default function AdminSpeakingPage() {
  return (
    <>
      <Head>
        <title>Admin · Speaking Prompts</title>
      </Head>
      <RoleGuard allow={['admin', 'teacher']}>
        <AdminSpeakingPrompts />
      </RoleGuard>
    </>
  );
}

