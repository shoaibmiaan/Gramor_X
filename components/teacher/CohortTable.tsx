// components/teacher/CohortTable.tsx
import * as React from 'react';
import Image from 'next/image';
import {
  Badge,
  Button,
  ProgressBar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/design-system';
import type { TeacherCohortMember } from '@/types/teacher';

export type CohortRow = TeacherCohortMember & {
  fullName?: string;
  email?: string;
  avatarUrl?: string;
  completed?: number;
  total?: number;
};

export type CohortTableProps = {
  rows: ReadonlyArray<CohortRow>;
  onNudge?: (studentId: string) => void | Promise<void>;
  onRemove?: (membershipId: string) => void | Promise<void>;
  sortBy?: "name" | "progress" | "joined";
};

export function CohortTable({ rows, onNudge, onRemove, sortBy = 'progress' }: CohortTableProps) {
  const [order, setOrder] = React.useState<'asc' | 'desc'>('desc');

  const sorted = React.useMemo(() => {
    const list = [...rows];
    const cmp = (a: CohortRow, b: CohortRow) => {
      if (sortBy === 'name') {
        return (a.fullName || '').localeCompare(b.fullName || '');
      } else if (sortBy === 'joined') {
        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      }
      // progress
      const ap = pct(a.completed ?? 0, a.total ?? 0);
      const bp = pct(b.completed ?? 0, b.total ?? 0);
      return ap - bp;
    };
    list.sort(cmp);
    if (order === 'desc') list.reverse();
    return list;
  }, [rows, sortBy, order]);

  return (
    <TableContainer className="bg-card">
      <div className="flex items-center justify-between border-b border-border/60 px-md py-sm">
        <h4 className="text-small font-semibold text-text">Cohort Members</h4>
        <div className="flex items-center gap-sm">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="text-muted"
          >
            Progress {order === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted">
                No students yet.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="flex items-center gap-sm">
                    <Avatar name={r.fullName || r.studentId} src={r.avatarUrl} />
                    <div className="min-w-0">
                      <div className="truncate text-text">{r.fullName || '—'}</div>
                      <div className="text-caption text-muted">{shortId(r.studentId)}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted">{r.email || '—'}</TableCell>
                <TableCell className="text-muted">
                  <time dateTime={r.joinedAt} suppressHydrationWarning>
                    {new Date(r.joinedAt).toLocaleDateString()}
                  </time>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-sm">
                    <div className="w-40">
                      <ProgressBar
                        value={pct(r.completed ?? 0, r.total ?? 0)}
                        ariaLabel={`Progress for ${r.fullName || r.studentId}`}
                      />
                    </div>
                    <Badge variant="neutral" size="xs" className="tabular-nums">
                      {(r.completed ?? 0)}/{(r.total ?? 0)}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-sm">
                    {onNudge && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onNudge(r.studentId)}
                      >
                        Nudge
                      </Button>
                    )}
                    {onRemove && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => onRemove(r.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function pct(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

function shortId(id: string) {
  return id.length > 8 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
}

function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) {
    return (
      <div className="relative h-9 w-9 overflow-hidden rounded-full border border-border bg-panel">
        <Image src={src} alt={name} fill sizes="36px" />
      </div>
    );
  }
  const initials = (name || "U")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="grid h-9 w-9 place-items-center rounded-full border border-border bg-panel text-caption text-muted">
      {initials}
    </div>
  );
}

// ProgressBar handles visualization; pct helper remains for calculations.
