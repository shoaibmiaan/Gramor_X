import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useDebounce } from 'use-debounce';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { Badge } from '@/components/design-system/Badge';
import { useToast } from '@/components/design-system/Toaster';
import type { PlanId } from '@/types/pricing';

const PLAN_FILTERS: Array<{ value: 'all' | PlanId; label: string }> = [
  { value: 'all', label: 'All plans' },
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter' },
  { value: 'booster', label: 'Booster' },
  { value: 'master', label: 'Master' },
];

type WritingAttemptRow = {
  attemptId: string;
  userId: string;
  studentName: string | null;
  email: string | null;
  plan: PlanId;
  averageBand: number;
  submittedAt: string | null;
  tasks: Array<{ task: string; band: number }>;
};

const escapeCsv = (value: string | number | null | undefined) => {
  const str = value == null ? '' : String(value);
  if (/[,"\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const escapePdf = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

function buildSummaryPdf(rows: WritingAttemptRow[]): Blob {
  const headline = rows.length === 1 ? 'Writing attempt summary' : 'Writing attempts summary';
  const lines = [headline, `Generated: ${new Date().toISOString()}`, `Total attempts: ${rows.length}`, ''];
  rows.slice(0, 25).forEach((row) => {
    lines.push(`Attempt ${row.attemptId}`);
    lines.push(`Student: ${row.studentName ?? row.email ?? row.userId}`);
    lines.push(`Plan: ${row.plan} · Band ${row.averageBand.toFixed(1)} · Submitted: ${row.submittedAt ?? 'pending'}`);
    row.tasks.forEach((task) => {
      lines.push(`  - Task ${task.task.replace('task', '')}: ${task.band.toFixed(1)}`);
    });
    lines.push('');
  });

  const content = lines
    .map((line, index) => `BT /F1 11 Tf 50 ${770 - index * 18} Td (${escapePdf(line)}) Tj ET`)
    .join('\n');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];

  const header = '%PDF-1.4';
  const parts: string[] = [header];
  const xref: string[] = ['0000000000 65535 f '];
  let offset = header.length + 1;
  for (const object of objects) {
    parts.push(object);
    xref.push(`${offset.toString().padStart(10, '0')} 00000 n `);
    offset += object.length + 1;
  }
  const xrefStart = offset;
  parts.push('xref');
  parts.push(`0 ${objects.length + 1}`);
  parts.push(...xref);
  parts.push('trailer << /Size ' + (objects.length + 1) + ' /Root 1 0 R >>');
  parts.push('startxref');
  parts.push(String(xrefStart));
  parts.push('%%EOF');

  return new Blob([parts.join('\n')], { type: 'application/pdf' });
}

export default function AdminWritingAttemptsPage() {
  const [plan, setPlan] = useState<'all' | PlanId>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<WritingAttemptRow[]>([]);
  const { success, error } = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams();
    if (plan !== 'all') params.set('plan', plan);
    if (debouncedSearch) params.set('q', debouncedSearch);

    fetch(`/api/admin/writing/list?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load attempts');
        return (await res.json()) as { attempts: WritingAttemptRow[] };
      })
      .then((payload) => {
        if (cancelled) return;
        setAttempts(payload.attempts);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        error(err instanceof Error ? err.message : 'Could not load attempts');
        setAttempts([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [plan, debouncedSearch, error]);

  const handleExportCsv = () => {
    if (attempts.length === 0) {
      error('No attempts to export yet.');
      return;
    }
    const rows = attempts.map((row) => [
      row.attemptId,
      row.userId,
      row.studentName ?? '',
      row.email ?? '',
      row.plan,
      row.averageBand.toFixed(1),
      row.submittedAt ?? '',
    ]);
    const header = ['attempt_id', 'user_id', 'student', 'email', 'plan', 'average_band', 'submitted_at'];
    const csv = [header, ...rows].map((line) => line.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `writing-attempts-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    success('Exported CSV for current view');
  };

  const handleExportPdf = () => {
    if (attempts.length === 0) {
      error('No attempts to export yet.');
      return;
    }
    const blob = buildSummaryPdf(attempts);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `writing-attempts-${Date.now()}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
    success('PDF summary downloaded');
  };

  const handleRegrade = async (attemptId: string) => {
    try {
      const res = await fetch('/api/admin/writing/regrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Failed to regrade attempt');
      }
      success('Regrade queued');
    } catch (err) {
      error(err instanceof Error ? err.message : 'Could not queue regrade');
    }
  };

  const visible = useMemo(() => attempts, [attempts]);

  return (
    <RoleGuard allow={['admin', 'teacher'] as any}>
      <Head>
        <title>Admin · Writing attempts</title>
      </Head>
      <Container className="py-10 space-y-8">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Writing attempts</h1>
            <p className="text-sm text-muted-foreground">Review recent submissions, export summaries, and queue regrades.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportCsv} disabled={loading}>
              Export CSV
            </Button>
            <Button onClick={handleExportPdf} disabled={loading}>
              Export PDF
            </Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-[240px_1fr]">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-muted-foreground">Plan filter</label>
            <select
              value={plan}
              onChange={(event) => setPlan(event.target.value as 'all' | PlanId)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              {PLAN_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <Input
              label="Search"
              placeholder="Filter by student name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/50">
              <thead className="bg-muted/40">
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-4 py-3">Attempt</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Band</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Loading attempts…
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No attempts match the current filters.
                    </td>
                  </tr>
                ) : (
                  visible.map((row) => (
                    <tr key={row.attemptId}>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.attemptId}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{row.studentName ?? 'Unknown student'}</div>
                        <div className="text-xs text-muted-foreground">{row.email ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" size="sm">
                          {row.plan}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-foreground">{row.averageBand.toFixed(1)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : 'Pending'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/api/writing/export/pdf?attemptId=${row.attemptId}`, '_blank')}
                          >
                            PDF
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/cert/writing/${row.attemptId}`, '_blank')}
                          >
                            Certificate
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/admin/imp-as?u=${row.userId}`, '_self')}
                          >
                            Impersonate
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => handleRegrade(row.attemptId)}>
                            Regrade
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </Container>
    </RoleGuard>
  );
}

