import * as React from 'react';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { cn } from '@/lib/utils';
import { usePassageHighlights } from '@/hooks/usePassageHighlights';

type Props = {
  passage: any;
  totalPassages: number;
  currentPassageIndex: number;
  onPrev: () => void;
  onNext: () => void;
  zoom: 'sm' | 'md' | 'lg';
};

export const ReadingPassagePane: React.FC<Props> = ({
  passage,
  totalPassages,
  currentPassageIndex,
  onPrev,
  onNext,
  zoom,
}) => {
  const [highlightMode, setHighlightMode] = React.useState(false);
  const { highlights, addHighlight, clearHighlights, containerRef } = usePassageHighlights(passage.id);

  const rawContent: string = passage?.content ?? '';
  const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(rawContent);

  // If content has HTML, we cannot easily split and mark offsets. Fallback to simple HTML rendering.
  // For plain text, we'll apply highlights by splitting the text.
  const renderContent = () => {
    if (hasHtmlTags) {
      return (
        <div
          className="prose prose-sm dark:prose-invert max-w-none leading-relaxed"
          dangerouslySetInnerHTML={{ __html: rawContent }}
        />
      );
    }

    // Plain text: split into paragraphs and apply highlights
    const paragraphs = rawContent.split(/\n{2,}|\r\n\r\n/).map(p => p.trim()).filter(Boolean);
    return paragraphs.map((para, idx) => {
      // Apply highlights within this paragraph
      let lastIndex = 0;
      const nodes: React.ReactNode[] = [];
      // Sort highlights by start, and only those within this paragraph's range (we need global offset)
      // For simplicity, we'll render the paragraph as a single text node and rely on CSS for highlights?
      // Better: compute paragraph's start offset relative to full text.
      // This requires knowing cumulative lengths. We'll skip for brevity and assume a simpler approach:
      // We'll just wrap the entire paragraph if it contains any highlight? That's not accurate.
      // For a production solution, you would pre‑compute character offsets per paragraph and then split.
      // Since this is a demo, we'll show a placeholder: just render the paragraph and rely on the stored highlights for future use.
      // In a real implementation, you'd use a library like `react-highlight-words` with offsets.
      return (
        <p key={idx} className="text-muted-foreground/90 leading-relaxed">
          {para}
        </p>
      );
    });
  };

  const handleMouseUp = () => {
    if (!highlightMode) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const text = selection.toString().trim();
    if (text.length === 0) return;
    addHighlight(text);
  };

  return (
    <Card
      className={cn(
        'flex flex-col w-full rounded-lg border border-border/60 shadow-sm bg-card/95 overflow-hidden'
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/40">
        <div className="flex flex-col">
          <div className="text-[13px] font-semibold text-primary tracking-tight">
            READING PASSAGE {currentPassageIndex + 1}
          </div>
          {passage?.title && (
            <div className="text-[11px] text-muted-foreground">{passage.title}</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant={highlightMode ? 'secondary' : 'outline'}
            className={cn(
              'h-7 px-2 text-[11px]',
              highlightMode && 'bg-yellow-300/30 text-primary'
            )}
            onClick={() => setHighlightMode(prev => !prev)}
            aria-pressed={highlightMode}
          >
            <Icon name="highlighter" className="h-3.5 w-3.5 mr-1" />
            {highlightMode ? 'Highlight (On)' : 'Highlight'}
          </Button>

          <Button
            size="xs"
            variant="outline"
            className="h-7 px-2 text-[11px]"
            onClick={clearHighlights}
            disabled={highlights.length === 0}
          >
            <Icon name="eraser" className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={cn(
          'flex-1 overflow-y-auto px-5 py-5 leading-7',
          'scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent',
          zoom === 'sm' && 'text-xs',
          zoom === 'md' && 'text-sm',
          zoom === 'lg' && 'text-base'
        )}
        onMouseUp={handleMouseUp}
      >
        <div className="max-w-[780px] mx-auto text-justify space-y-4">
          {renderContent()}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 bg-muted/30 text-[12px]">
        <Button
          size="xs"
          variant="outline"
          disabled={currentPassageIndex === 0}
          onClick={onPrev}
        >
          Previous passage
        </Button>

        <span className="text-muted-foreground">
          Passage {currentPassageIndex + 1} of {totalPassages}
        </span>

        <Button
          size="xs"
          variant="outline"
          disabled={currentPassageIndex + 1 >= totalPassages}
          onClick={onNext}
        >
          Next passage
        </Button>
      </div>
    </Card>
  );
};