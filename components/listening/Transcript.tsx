import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/design-system/Icon';

type Cue = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
};

type TranscriptProps = {
  transcript?: string | null;
  locked?: boolean;
  currentTimeMs?: number;
  onSeek?: (relativeMs: number) => void;
  followActiveCue?: boolean;
  className?: string;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

function parseTimestamp(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.');
  if (!cleaned) return null;
  const parts = cleaned.split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  const [h, m, s] =
    parts.length === 3
      ? [Number(parts[0]), Number(parts[1]), Number(parts[2])]
      : [0, Number(parts[0]), Number(parts[1])];
  if ([h, m, s].some((v) => Number.isNaN(v))) return null;
  const secs = s;
  const whole = Math.trunc(secs);
  const frac = secs - whole;
  const total = h * 3600 + m * 60 + whole + frac;
  return Math.max(0, Math.round(total * 1000));
}

const TIMING_RE = /(?<start>\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\s*-->\s*(?<end>\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)/;

function stripHtml(text: string) {
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function parseTranscript(raw?: string | null): Cue[] {
  if (!raw) return [];
  const normalized = raw
    .replace(/\r/g, '')
    .replace(/^WEBVTT[^\n]*\n?/i, '')
    .replace(/<br\s*\/>/gi, '\n')
    .trim();
  if (!normalized) return [];

  const blocks = normalized.split(/\n{2,}/);
  const cues: Cue[] = [];

  blocks.forEach((block, idx) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return;

    let pointer = 0;
    if (/^\d+$/.test(lines[0])) pointer += 1;
    const timingLine = lines[pointer] || '';
    const match = timingLine.match(TIMING_RE);

    let start = 0;
    let end = 0;
    if (match?.groups) {
      start = parseTimestamp(match.groups.start) ?? 0;
      end = parseTimestamp(match.groups.end) ?? start;
      pointer += 1;
    }

    const text = stripHtml(lines.slice(pointer).join(' '));
    if (!text) return;

    if (!match) {
      // Not a timecoded block; approximate order by index.
      start = cues.length ? cues[cues.length - 1].endMs : 0;
      end = start + Math.max(2000, text.split(' ').length * 600);
    } else if (end <= start) {
      end = start + Math.max(500, text.split(' ').length * 400);
    }

    cues.push({
      id: `${idx}-${start}`,
      startMs: start,
      endMs: end,
      text,
    });
  });

  if (cues.length) {
    return cues.sort((a, b) => a.startMs - b.startMs);
  }

  // Fallback: treat each line as a cue even without timing.
  const fallbackLines = normalized.split(/\n+/).map((line) => stripHtml(line)).filter(Boolean);
  return fallbackLines.map((text, idx) => ({
    id: `plain-${idx}`,
    startMs: idx * 4000,
    endMs: (idx + 1) * 4000,
    text,
  }));
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export const Transcript: React.FC<TranscriptProps> = ({
  transcript,
  locked = false,
  currentTimeMs = 0,
  onSeek,
  followActiveCue = true,
  className = '',
  expanded,
  defaultExpanded = false,
  onExpandedChange,
}) => {
  const cues = useMemo(() => parseTranscript(transcript), [transcript]);
  const isControlled = typeof expanded === 'boolean';
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const expandedState = isControlled ? expanded : internalExpanded;
  const contentId = useMemo(() => `transcript-panel-${Math.random().toString(36).slice(2, 8)}`, []);
  const cueRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!locked) return;
    if (expandedState) {
      if (!isControlled) {
        setInternalExpanded(false);
      }
      onExpandedChange?.(false);
    }
  }, [expandedState, isControlled, locked, onExpandedChange]);

  const activeIndex = useMemo(() => {
    if (!cues.length) return -1;
    const idx = cues.findIndex((cue) => currentTimeMs >= cue.startMs && currentTimeMs < cue.endMs);
    return idx;
  }, [cues, currentTimeMs]);

  useEffect(() => {
    if (!followActiveCue || !expanded) return;
    if (activeIndex < 0) return;
    const el = cueRefs.current[activeIndex];
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeIndex, expanded, followActiveCue]);

  const setExpandedState = (next: boolean) => {
    if (!isControlled) {
      setInternalExpanded(next);
    }
    onExpandedChange?.(next);
  };

  const handleToggle = () => {
    if (locked || !cues.length) return;
    setExpandedState(!expandedState);
  };

  const handleCueClick = (cue: Cue) => {
    if (!onSeek || locked) return;
    onSeek(cue.startMs);
  };

  const disabled = locked || !cues.length;
  const showContent = expandedState && !locked && cues.length > 0;
  const controlLabel = locked
    ? 'Transcript locked until you check your answers'
    : cues.length
    ? showContent
      ? 'Hide transcript'
      : 'Show transcript'
    : 'Transcript unavailable';

  return (
    <div className={`card-surface rounded-ds p-4 ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className={`flex w-full items-center justify-between gap-2 rounded-ds border border-lightBorder px-3 py-2 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10`}
        aria-expanded={showContent}
        aria-controls={contentId}
        disabled={disabled}
        aria-label={controlLabel}
      >
        <span className="flex items-center gap-2 font-semibold">
          <Icon name={showContent ? 'chevron-up' : 'chevron-down'} />
          Transcript
        </span>
        <span className="text-small text-grayish">
          {locked ? 'Locked' : cues.length ? (showContent ? 'Hide' : 'Show') : 'Unavailable'}
        </span>
      </button>

      {locked ? (
        <p className="mt-3 text-small text-grayish">
          Transcript will unlock after you submit your answers.
        </p>
      ) : (
        <div
          id={contentId}
          hidden={!showContent}
          className="mt-3 max-h-64 overflow-y-auto rounded-ds border border-lightBorder bg-white/40 p-3 text-small leading-relaxed dark:border-white/10 dark:bg-white/5"
          aria-live="polite"
        >
          {cues.length ? (
            <ul className="space-y-2">
              {cues.map((cue, idx) => {
                const active = idx === activeIndex;
                return (
                  <li key={cue.id}>
                    <button
                      type="button"
                      onClick={() => handleCueClick(cue)}
                      ref={(node) => {
                        cueRefs.current[idx] = node;
                      }}
                      className={`w-full rounded-ds border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                        active
                          ? 'border-primary/70 bg-primary/10 text-primary'
                          : 'border-lightBorder dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex-1 whitespace-pre-line break-words text-sm">{cue.text}</span>
                        <span className={`ml-2 shrink-0 text-caption ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                          {formatTimestamp(cue.startMs)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-small text-grayish">No transcript available for this section.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Transcript;
