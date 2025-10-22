import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type HighlightRange = {
  id: string;
  start: number;
  end: number;
  color: string;
  noteText?: string | null;
};

type SelectionPayload = {
  start: number;
  end: number;
  text: string;
  noteText?: string;
};

type ReadingPassageProps = {
  text: string;
  highlights: HighlightRange[];
  onCreateHighlight: (payload: SelectionPayload) => void;
  onCreateNote: (payload: SelectionPayload) => void;
  onHighlightFocus?: (id: string) => void;
};

type SelectionState = {
  start: number;
  end: number;
  text: string;
  rect: DOMRect;
};

const COLOR_CLASS: Record<string, string> = {
  warning: 'bg-warning/30 border-warning/50',
  primary: 'bg-primary/20 border-primary/60',
  accent: 'bg-accent/20 border-accent/60',
};

function clampPosition(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

const TOOLBAR_WIDTH = 260;
const TOOLBAR_PADDING = 16;

export const ReadingPassage: React.FC<ReadingPassageProps> = ({
  text,
  highlights,
  onCreateHighlight,
  onCreateNote,
  onHighlightFocus,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [isNoteComposerOpen, setNoteComposerOpen] = useState(false);

  const sortedHighlights = useMemo(() => {
    return [...highlights]
      .filter((item) => item.end > item.start)
      .sort((a, b) => a.start - b.start);
  }, [highlights]);

  const segments = useMemo(() => {
    const nodes: Array<{ key: string; content: string; highlight?: HighlightRange }> = [];
    let cursor = 0;
    for (const highlight of sortedHighlights) {
      const start = Math.max(0, Math.min(highlight.start, text.length));
      const end = Math.max(start, Math.min(highlight.end, text.length));
      if (start > cursor) {
        nodes.push({ key: `text-${cursor}-${start}`, content: text.slice(cursor, start) });
      }
      if (end > start) {
        nodes.push({ key: `hl-${highlight.id}`, content: text.slice(start, end), highlight });
      }
      cursor = Math.max(cursor, end);
    }
    if (cursor < text.length) {
      nodes.push({ key: `text-${cursor}-${text.length}`, content: text.slice(cursor) });
    }
    if (nodes.length === 0) {
      nodes.push({ key: 'plain', content: text });
    }
    return nodes;
  }, [sortedHighlights, text]);

  const clearSelection = useCallback(() => {
    if (typeof window !== 'undefined') {
      const active = window.getSelection();
      if (active) {
        try {
          active.removeAllRanges();
        } catch {
          // ignore
        }
      }
    }
    setSelection(null);
    setNoteComposerOpen(false);
    setNoteDraft('');
  }, []);

  const computeSelection = useCallback(() => {
    if (typeof window === 'undefined') return;
    const root = containerRef.current;
    if (!root) return;

    const selectionObj = window.getSelection();
    if (!selectionObj || selectionObj.rangeCount === 0 || selectionObj.isCollapsed) {
      setSelection(null);
      setNoteComposerOpen(false);
      setNoteDraft('');
      return;
    }

    const range = selectionObj.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
      setSelection(null);
      setNoteComposerOpen(false);
      setNoteDraft('');
      return;
    }

    const cloned = range.cloneRange();
    cloned.selectNodeContents(root);
    cloned.setEnd(range.startContainer, range.startOffset);
    const leading = cloned.toString();
    const selectedText = range.toString();
    const start = leading.length;
    const end = start + selectedText.length;

    if (selectedText.trim().length === 0 || end <= start) {
      setSelection(null);
      setNoteComposerOpen(false);
      setNoteDraft('');
      return;
    }

    const rect = range.getBoundingClientRect();
    setSelection({ start, end, text: selectedText, rect });
    setNoteComposerOpen(false);
    setNoteDraft('');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => computeSelection();
    document.addEventListener('selectionchange', handler);
    return () => {
      document.removeEventListener('selectionchange', handler);
    };
  }, [computeSelection]);

  useEffect(() => {
    if (!selection) return;
    if (typeof window === 'undefined') return;

    const updateRect = () => {
      const active = window.getSelection();
      if (!active || active.rangeCount === 0) return;
      const range = active.getRangeAt(0);
      setSelection((prev) => (prev ? { ...prev, rect: range.getBoundingClientRect() } : prev));
    };

    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [selection]);

  const handleCreateHighlight = useCallback(() => {
    if (!selection) return;
    onCreateHighlight({ start: selection.start, end: selection.end, text: selection.text });
    clearSelection();
  }, [selection, onCreateHighlight, clearSelection]);

  const handleOpenNoteComposer = useCallback(() => {
    if (!selection) return;
    setNoteComposerOpen(true);
    setNoteDraft('');
  }, [selection]);

  const handleSaveNote = useCallback(() => {
    if (!selection) return;
    const trimmed = noteDraft.trim();
    if (!trimmed) return;
    onCreateNote({ start: selection.start, end: selection.end, text: selection.text, noteText: trimmed });
    clearSelection();
  }, [selection, noteDraft, onCreateNote, clearSelection]);

  const toolbarPosition = useMemo(() => {
    if (!selection) return { top: 0, left: 0 };
    if (typeof window === 'undefined') return { top: 0, left: 0 };
    const viewportWidth = window.innerWidth || 0;
    const desiredLeft = selection.rect.left + selection.rect.width / 2 - TOOLBAR_WIDTH / 2;
    const left = clampPosition(desiredLeft, TOOLBAR_PADDING, Math.max(TOOLBAR_PADDING, viewportWidth - TOOLBAR_WIDTH - TOOLBAR_PADDING));
    const top = clampPosition(selection.rect.top - 56, TOOLBAR_PADDING, Math.max(TOOLBAR_PADDING, selection.rect.top + selection.rect.height + 8));
    return { top, left };
  }, [selection]);

  useEffect(() => {
    const node = toolbarRef.current;
    if (!node) return;
    node.style.setProperty('--reading-toolbar-top', `${toolbarPosition.top}px`);
    node.style.setProperty('--reading-toolbar-left', `${toolbarPosition.left}px`);
  }, [toolbarPosition]);

  return (
    <div className="relative">
      {selection && (
        <div
          ref={toolbarRef}
          className="fixed left-[var(--reading-toolbar-left)] top-[var(--reading-toolbar-top)] z-40 flex w-[260px] flex-col gap-2"
        >
          <div className="flex items-center justify-between gap-2 rounded-full border border-border bg-popover px-3 py-1 text-small text-popover-foreground shadow-lg">
            <button
              type="button"
              onClick={handleCreateHighlight}
              className="rounded-full bg-primary px-3 py-1 text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
            >
              Highlight
            </button>
            <button
              type="button"
              onClick={handleOpenNoteComposer}
              className="rounded-full bg-secondary px-3 py-1 text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
            >
              Add note
            </button>
            <button
              type="button"
              onClick={clearSelection}
              aria-label="Cancel selection"
              className="rounded-full border border-border px-3 py-1 text-foreground transition hover:border-danger hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
            >
              ×
            </button>
          </div>
          {isNoteComposerOpen && (
            <div className="rounded-2xl border border-border bg-background p-3 shadow-xl">
              <label className="mb-2 block text-caption font-medium text-foreground/80" htmlFor="reading-note-input">
                Add a note
              </label>
              <textarea
                id="reading-note-input"
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-small focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Type your note"
              />
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded-full border border-border px-3 py-1 text-small text-foreground/70 hover:border-foreground/50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={!noteDraft.trim()}
                  className="rounded-full bg-primary px-4 py-1 text-small font-medium text-background transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className="whitespace-pre-wrap text-small leading-6 text-foreground/90"
        role="document"
        aria-label="Reading passage"
      >
        {segments.map((segment) => {
          if (!segment.highlight) {
            return (
              <span key={segment.key} className="whitespace-pre-wrap">
                {segment.content}
              </span>
            );
          }

          const colorClass = COLOR_CLASS[segment.highlight.color] ?? COLOR_CLASS.warning;

          return (
            <button
              type="button"
              key={segment.key}
              onClick={() => onHighlightFocus?.(segment.highlight!.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onHighlightFocus?.(segment.highlight!.id);
                }
              }}
              aria-label={
                segment.highlight.noteText
                  ? `Open note for highlighted text: ${segment.content}`
                  : `Highlighted text. Add a note.`
              }
              className={`inline whitespace-pre-wrap rounded-md border px-1 py-0.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${colorClass}`}
            >
              {segment.content}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ReadingPassage;
