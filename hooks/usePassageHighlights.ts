import { useState, useCallback, useRef, useEffect } from 'react';

export type Highlight = {
  start: number;
  end: number;
  text: string;
};

export function usePassageHighlights(passageId: string) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load highlights from localStorage on mount
  useEffect(() => {
    const key = `reading:highlights:${passageId}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setHighlights(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load highlights', e);
    }
  }, [passageId]);

  // Save highlights to localStorage whenever they change
  useEffect(() => {
    const key = `reading:highlights:${passageId}`;
    try {
      if (highlights.length) {
        localStorage.setItem(key, JSON.stringify(highlights));
      } else {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.error('Failed to save highlights', e);
    }
  }, [highlights, passageId]);

  const addHighlight = useCallback((selectedText: string) => {
    if (!containerRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(containerRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;

    const end = start + range.toString().length;

    // Avoid duplicate highlights (same text and roughly same position)
    const newHighlight = { start, end, text: selectedText };
    setHighlights(prev => {
      // Simple deduplication: ignore if exactly the same start/end exists
      if (prev.some(h => h.start === start && h.end === end)) return prev;
      return [...prev, newHighlight].sort((a, b) => a.start - b.start);
    });

    selection.removeAllRanges();
  }, []);

  const clearHighlights = useCallback(() => {
    setHighlights([]);
  }, []);

  return {
    highlights,
    addHighlight,
    clearHighlights,
    containerRef,
  };
}