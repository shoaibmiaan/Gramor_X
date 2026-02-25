'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';

type Datum = {
  date: string;
  completed: number;
  total: number;
};

type Props = {
  data: Datum[];
};

type HeatmapCell = Datum & {
  column: number;
  weekRow: number;
  ariaLabel: string;
  description: string;
  displayDate: string;
  globalIndex: number;
  parsedDate: Date;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const LEGEND_STEPS = [
  { label: 'No tasks', className: 'bg-muted border border-border/40' },
  { label: 'Started', className: 'bg-primary/20 border border-primary/20' },
  { label: 'In progress', className: 'bg-primary/40 border border-primary/40' },
  { label: 'On track', className: 'bg-primary/70 border border-primary/70' },
  { label: 'Complete', className: 'bg-primary border border-primary' },
];

type MonthGroup = {
  key: string;
  label: string;
  leading: number;
  order: number;
  cells: HeatmapCell[];
};

const parseISODate = (iso: string): Date | null => {
  if (typeof iso !== 'string') return null;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

function getColorClass(entry: Datum) {
  if (entry.total === 0) {
    return LEGEND_STEPS[0].className;
  }

  const ratio = entry.total === 0 ? 0 : entry.completed / entry.total;

  if (ratio === 0) return LEGEND_STEPS[0].className;
  if (ratio < 0.33) return LEGEND_STEPS[1].className;
  if (ratio < 0.66) return LEGEND_STEPS[2].className;
  if (ratio < 1) return LEGEND_STEPS[3].className;
  return LEGEND_STEPS[4].className;
}

export const StreakHeatmap: React.FC<Props> = ({ data }) => {
  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: 'long',
        year: 'numeric',
      }),
    [],
  );
  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: 'long',
        day: 'numeric',
      }),
    [],
  );
  const shortFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    [],
  );

  const months = useMemo<MonthGroup[]>(() => {
    if (!data.length) return [];

    const sorted = [...data]
      .map((entry) => {
        const parsedDate = parseISODate(entry.date);
        return parsedDate ? { entry, parsedDate } : null;
      })
      .filter((item): item is { entry: Datum; parsedDate: Date } => item !== null)
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
    const map = new Map<string, MonthGroup>();

    for (const { entry, parsedDate } of sorted) {
      const monthKey = `${parsedDate.getUTCFullYear()}-${parsedDate.getUTCMonth()}`;
      let bucket = map.get(monthKey);

      if (!bucket) {
        const firstOfMonth = new Date(
          Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), 1),
        );
        const leading = (firstOfMonth.getUTCDay() + 6) % 7;
        bucket = {
          key: monthKey,
          label: monthFormatter.format(firstOfMonth),
          leading,
          order: firstOfMonth.getTime(),
          cells: [],
        };
        map.set(monthKey, bucket);
      }

      bucket.cells.push({
        ...entry,
        column: 0,
        weekRow: 0,
        ariaLabel: '',
        description: '',
        displayDate: '',
        globalIndex: -1,
        parsedDate,
      });
    }

    const result: MonthGroup[] = [];
    const groups = Array.from(map.values()).sort((a, b) => a.order - b.order);

    let runningIndex = 0;

    for (const group of groups) {
      group.cells.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

      group.cells = group.cells.map((cell, index) => {
        const offset = group.leading + index;
        const column = offset % 7;
        const weekRow = Math.floor(offset / 7);
        const description = cell.total === 0 ? 'No tasks scheduled' : `${cell.completed} of ${cell.total} completed`;
        return {
          ...cell,
          column,
          weekRow,
          displayDate: shortFormatter.format(cell.parsedDate),
          description,
          ariaLabel: `${dayFormatter.format(cell.parsedDate)} — ${description}`,
          globalIndex: runningIndex++,
        };
      });

      result.push(group);
    }

    return result;
  }, [data, dayFormatter, monthFormatter, shortFormatter]);

  const allCells = useMemo(() => months.flatMap((month) => month.cells), [months]);
  const totalCells = allCells.length;
  const [focusedIndex, setFocusedIndex] = useState(0);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const ensureFocus = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(index, totalCells - 1));
      setFocusedIndex(next);
      cellRefs.current[next]?.focus();
    },
    [totalCells],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, cell: HeatmapCell) => {
      if (!totalCells) return;
      let nextIndex: number | null = null;

      switch (event.key) {
        case 'ArrowRight':
          nextIndex = Math.min(totalCells - 1, cell.globalIndex + 1);
          break;
        case 'ArrowLeft':
          nextIndex = Math.max(0, cell.globalIndex - 1);
          break;
        case 'ArrowUp':
          nextIndex = cell.globalIndex - 7;
          if (nextIndex < 0) nextIndex = null;
          break;
        case 'ArrowDown':
          nextIndex = cell.globalIndex + 7;
          if (nextIndex >= totalCells) nextIndex = null;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = totalCells - 1;
          break;
        default:
          break;
      }

      if (nextIndex !== null && nextIndex !== cell.globalIndex) {
        event.preventDefault();
        ensureFocus(nextIndex);
      }
    },
    [ensureFocus, totalCells],
  );

  if (!totalCells) {
    return (
      <div className="flex h-64 items-center justify-center rounded-ds-2xl border border-dashed border-border text-small text-muted-foreground">
        Complete a task to start your streak calendar.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wide text-[10px] text-muted-foreground">Legend</span>
          {LEGEND_STEPS.map((step) => (
            <span key={step.label} className="flex items-center gap-1">
              <span className={`h-3 w-3 rounded-sm ${step.className}`} aria-hidden />
              {step.label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {WEEKDAYS.map((weekday) => (
            <span key={weekday} className="text-center">
              {weekday}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {months.map((month) => (
          <div key={month.key} className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold text-small text-foreground">{month.label}</h3>
              <span className="text-xs text-muted-foreground">
                {month.cells.filter((cell) => cell.completed > 0).length} productive days
              </span>
            </div>

            <div
              role="grid"
              aria-label={`${month.label} study activity`}
              className="grid grid-cols-7 gap-1 sm:gap-2"
            >
              {Array.from({ length: month.leading }).map((_, index) => (
                <div
                  key={`${month.key}-spacer-${index}`}
                  aria-hidden
                  className="h-8 w-8 rounded-md sm:h-9 sm:w-9"
                />
              ))}

              {month.cells.map((cell) => {
                const colorClass = getColorClass(cell);
                const isFocused = focusedIndex === cell.globalIndex;
                return (
                  <button
                    key={cell.date}
                    type="button"
                    ref={(ref) => {
                      cellRefs.current[cell.globalIndex] = ref;
                    }}
                    role="gridcell"
                    aria-label={cell.ariaLabel}
                    tabIndex={isFocused ? 0 : -1}
                    onFocus={() => setFocusedIndex(cell.globalIndex)}
                    onKeyDown={(event) => handleKeyDown(event, cell)}
                    className={`h-8 w-8 rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-9 sm:w-9 ${colorClass}`}
                  >
                    <span className="sr-only">{cell.displayDate}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StreakHeatmap;
