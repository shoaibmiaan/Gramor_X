import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Input } from '@/components/design-system/Input';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';
import { AudioPlayer } from '@/components/audio/Player';
import { useToast } from '@/components/design-system/Toaster';

interface AttemptRow {
  id: string;
  createdAt: string;
  scenario: string | null;
  bandOverall: number | null;
  user: { id: string | null; name: string | null; email: string | null };
}

interface AttemptDetail {
  id: string;
  createdAt: string;
  scenario: string | null;
  bandOverall: number | null;
  bandBreakdown: Record<string, unknown> | null;
  transcript: string | null;
  topic: string | null;
  notes: string | null;
  user: { id: string | null; name: string | null; email: string | null };
  audio: Record<string, { path: string; signedUrl: string }[]>;
}

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const AttemptTable: React.FC<{
  rows: AttemptRow[];
  loading: boolean;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onSearch: (query: string) => void;
  query: string;
  total: number;
}> = ({ rows, loading, onSelect, selectedId, onSearch, query, total }) => {
  const [localQuery, setLocalQuery] = useState(query);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const submit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      onSearch(localQuery.trim());
    },
    [localQuery, onSearch],
  );

  return (
    <Card className="p-5 rounded-ds-2xl space-y-4">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-small font-medium block mb-1" htmlFor="attempt-search">
            Search attempts
          </label>
          <Input
            id="attempt-search"
            placeholder="Attempt ID, student email or name"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className="rounded-ds-xl"
          />
        </div>
        <Button type="submit" className="rounded-ds-xl" loading={loading} loadingText="Searching…">
          Search
        </Button>
      </form>

      <div className="text-small text-muted-foreground flex items-center justify-between">
        <span>Total: {total}</span>
        {query && <Badge variant="secondary" className="rounded-ds-xl">Filtered by “{query}”</Badge>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-small">
          <thead className="text-left border-b border-border/60">
            <tr>
              <th className="py-2 pr-3">Attempt</th>
              <th className="py-2 pr-3">Student</th>
              <th className="py-2 pr-3">Overall</th>
              <th className="py-2 pr-3">Created</th>
              <th className="py-2 pr-3">Scenario</th>
              <th className="py-2 pr-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted-foreground">
                  Loading attempts…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted-foreground">
                  No attempts found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isActive = selectedId === row.id;
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-border/40 ${isActive ? 'bg-primary/5' : ''}`}
                  >
                    <td className="py-3 pr-3 font-mono text-xs">{row.id}</td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{row.user.name ?? '—'}</span>
                        {row.user.email && <span className="text-muted-foreground">{row.user.email}</span>}
                      </div>
                    </td>
                    <td className="py-3 pr-3">{row.bandOverall ?? '—'}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                    <td className="py-3 pr-3">{row.scenario ?? '—'}</td>
                    <td className="py-3 pr-0 text-right">
                      <Button
                        type="button"
                        variant={isActive ? 'secondary' : 'outline'}
                        className="rounded-ds-xl"
                        onClick={() => onSelect(row.id)}
                      >
                        {isActive ? 'Viewing' : 'Open'}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const AttemptDetailCard: React.FC<{
  attempt: AttemptDetail | null;
  loading: boolean;
  error: string | null;
  onCopyId: () => void;
}> = ({ attempt, loading, error, onCopyId }) => {
  const breakdownEntries = useMemo(() => {
    if (!attempt?.bandBreakdown) return [];
    return Object.entries(attempt.bandBreakdown).filter(([_, value]) => value != null);
  }, [attempt?.bandBreakdown]);

  if (loading) {
    return (
      <Card className="p-5 rounded-ds-2xl">
        <div className="text-muted-foreground">Loading attempt…</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-5 rounded-ds-2xl">
        <Alert variant="destructive">{error}</Alert>
      </Card>
    );
  }

  if (!attempt) {
    return (
      <Card className="p-5 rounded-ds-2xl">
        <div className="text-muted-foreground">Select an attempt to view details.</div>
      </Card>
    );
  }

  return (
    <Card className="p-5 rounded-ds-2xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-h3 font-semibold">Attempt details</h2>
          <p className="text-small text-muted-foreground">{formatDate(attempt.createdAt)}</p>
        </div>
        <Button variant="outline" className="rounded-ds-xl" onClick={onCopyId}>
          Copy attempt ID
        </Button>
      </div>

      <div className="space-y-2 text-small">
        <div>
          <span className="font-medium">Student:</span>{' '}
          <span>{attempt.user.name || '—'}</span>
          {attempt.user.email && (
            <span className="text-muted-foreground"> &bull; {attempt.user.email}</span>
          )}
        </div>
        <div>
          <span className="font-medium">Attempt ID:</span>{' '}
          <code className="text-xs">{attempt.id}</code>
        </div>
        <div>
          <span className="font-medium">Scenario:</span>{' '}
          <span>{attempt.scenario ?? '—'}</span>
        </div>
        <div>
          <span className="font-medium">Topic:</span>{' '}
          <span>{attempt.topic ?? '—'}</span>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-h4 font-semibold">AI score</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success" className="rounded-ds-xl">
            Overall: {attempt.bandOverall ?? '—'}
          </Badge>
          {breakdownEntries.map(([key, value]) => (
            <Badge key={key} variant="info" className="rounded-ds-xl">
              {key}: {typeof value === 'number' ? value.toFixed(1) : value}
            </Badge>
          ))}
        </div>
        {attempt.notes && (
          <p className="text-small text-muted-foreground whitespace-pre-wrap">{attempt.notes}</p>
        )}
      </div>

      {attempt.transcript && (
        <div className="space-y-2">
          <h3 className="text-h4 font-semibold">Transcript</h3>
          <div className="max-h-60 overflow-auto rounded-ds border border-border/50 p-3 text-small whitespace-pre-wrap">
            {attempt.transcript}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-h4 font-semibold">Recordings</h3>
        {Object.entries(attempt.audio).length === 0 && (
          <p className="text-small text-muted-foreground">No audio files attached.</p>
        )}
        <div className="space-y-4">
          {Object.entries(attempt.audio).map(([label, files]) => (
            <div key={label}>
              <div className="font-medium uppercase tracking-wide text-xs mb-1">{label}</div>
              <div className="space-y-2">
                {files.map((file) => (
                  <AudioPlayer key={file.path} src={file.signedUrl} preload="metadata" className="w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

const AdminSpeakingAttemptsPage: React.FC = () => {
  const router = useRouter();
  const { success, error } = useToast();

  const [listLoading, setListLoading] = useState(true);
  const [rows, setRows] = useState<AttemptRow[]>([]);
  const [query, setQuery] = useState('');
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<AttemptDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchList = useCallback(async (search: string) => {
    setListLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      const res = await fetch(`/api/admin/speaking/attempts?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'Failed to load attempts');
      }
      setRows(json.items);
      setTotal(json.total ?? json.items.length);
      setQuery(search);
      if (json.items.length && !json.items.some((item: AttemptRow) => item.id === selectedId)) {
        setSelectedId(null);
        setSelected(null);
      }
    } catch (err: any) {
      error(err?.message || 'Failed to load attempts');
      setRows([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  }, [error, selectedId]);

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/admin/speaking/attempts/${id}`);
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'Failed to load attempt');
      }
      setSelected(json.attempt as AttemptDetail);
      setSelectedId(id);
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to load attempt');
      setSelected(null);
      setSelectedId(id);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList('');
  }, [fetchList]);

  useEffect(() => {
    if (!router.isReady) return;
    const fromQuery = (router.query.attempt as string) || (router.query.attemptId as string);
    if (fromQuery && typeof fromQuery === 'string') {
      fetchList(fromQuery);
      fetchDetail(fromQuery);
    }
  }, [router.isReady, router.query, fetchDetail, fetchList]);

  const handleCopyId = useCallback(() => {
    if (!selectedId) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(selectedId)
        .then(() => success('Attempt ID copied to clipboard'))
        .catch(() => error('Unable to copy attempt ID'));
    } else {
      error('Clipboard not available');
    }
  }, [error, selectedId, success]);

  return (
    <RoleGuard allow={['admin', 'teacher']}>
      <Head>
        <title>Admin • Speaking Attempts</title>
      </Head>
      <section className="py-10">
        <Container>
          <div className="mb-6 flex flex-col gap-2">
            <h1 className="text-h2 font-semibold tracking-tight">Speaking Attempts</h1>
            <p className="text-small text-muted-foreground">
              Review student speaking attempts, listen to their audio clips and reference AI scores.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <AttemptTable
              rows={rows}
              loading={listLoading}
              onSelect={fetchDetail}
              selectedId={selectedId}
              onSearch={fetchList}
              query={query}
              total={total}
            />
            <AttemptDetailCard attempt={selected} loading={detailLoading} error={detailError} onCopyId={handleCopyId} />
          </div>
        </Container>
      </section>
    </RoleGuard>
  );
};

export default AdminSpeakingAttemptsPage;
