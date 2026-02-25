import React, { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/design-system/Badge';
import { Card } from '@/components/design-system/Card';
import { Tabs } from '@/components/design-system/Tabs';
import { track } from '@/lib/analytics/track';
import type { WritingFeedback, WritingError } from '@/types/writing';

const SEVERITY_BADGE: Record<NonNullable<WritingError['severity']>, { label: string; variant: 'danger' | 'warning' | 'secondary' }> = {
  high: { label: 'High', variant: 'danger' },
  medium: { label: 'Medium', variant: 'warning' },
  low: { label: 'Low', variant: 'secondary' },
};

type Props = {
  essay: string;
  feedback: WritingFeedback;
};

type HighlightSegment = {
  text: string;
  error?: WritingError;
};

const buildSegments = (essay: string, errors: WritingError[] = []): HighlightSegment[] => {
  if (!essay) return [{ text: '' }];
  if (!errors || errors.length === 0) return [{ text: essay }];
  const segments: HighlightSegment[] = [];
  const sorted = [...errors].sort((a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0));
  let cursor = 0;

  sorted.forEach((error) => {
    const start = Math.max(0, error.startOffset ?? 0);
    const end = Math.max(start, error.endOffset ?? start);
    if (start > cursor) {
      segments.push({ text: essay.slice(cursor, start) });
    }
    segments.push({ text: essay.slice(start, end), error });
    cursor = end;
  });

  if (cursor < essay.length) {
    segments.push({ text: essay.slice(cursor) });
  }

  return segments;
};

const renderStrengths = (values: string[]) => {
  if (!values || values.length === 0) return <p className="text-sm text-muted-foreground">No strengths recorded yet.</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
      {values.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
};

const renderImprovements = (values: string[]) => {
  if (!values || values.length === 0) return <p className="text-sm text-muted-foreground">Feedback still processing.</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
      {values.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
};

const severityBadge = (error: WritingError) => {
  const info = error.severity ? SEVERITY_BADGE[error.severity] : null;
  if (!info) return null;
  return (
    <Badge size="sm" variant={info.variant} className="uppercase tracking-wide">
      {info.label}
    </Badge>
  );
};

const HighlightsView: React.FC<{ essay: string; errors: WritingError[] | undefined }> = ({ essay, errors }) => {
  const segments = useMemo(() => buildSegments(essay, errors ?? []), [essay, errors]);

  if (!errors || errors.length === 0) {
    return <p className="text-sm text-muted-foreground">No highlight-worthy issues detected in this draft.</p>;
  }

  return (
    <div className="space-y-6">
      <Card padding="md" className="bg-background">
        <p className="text-sm leading-relaxed text-foreground">
          {segments.map((segment, index) =>
            segment.error ? (
              <mark
                key={`${segment.text}-${index}`}
                className="rounded bg-warning/30 px-1 py-0.5 text-foreground"
              >
                {segment.text}
              </mark>
            ) : (
              <React.Fragment key={`${segment.text}-${index}`}>{segment.text}</React.Fragment>
            ),
          )}
        </p>
      </Card>

      <div className="space-y-4">
        {errors.map((error, index) => (
          <div key={`${error.excerpt}-${index}`} className="rounded-ds-xl border border-border/60 bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{error.message ?? 'Issue'}</p>
              {severityBadge(error)}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{error.excerpt}</p>
            {error.suggestion ? (
              <p className="mt-3 text-sm text-foreground">
                <span className="font-medium text-primary">Suggestion:</span> {error.suggestion}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

const RewriteView: React.FC<{ rewrite?: string }> = ({ rewrite }) => {
  if (!rewrite) {
    return <p className="text-sm text-muted-foreground">Band 9 rewrite will appear here once scoring is complete.</p>;
  }
  return (
    <article className="prose prose-sm max-w-none text-foreground">
      {rewrite.split('\n').map((paragraph, index) => (
        <p key={`${paragraph}-${index}`} className="leading-relaxed">
          {paragraph}
        </p>
      ))}
    </article>
  );
};

const FeedbackView: React.FC<{ feedback: WritingFeedback }> = ({ feedback }) => {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h3>
        <p className="text-sm leading-relaxed text-foreground">{feedback.summary}</p>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Strengths</h4>
          {renderStrengths(feedback.strengths)}
        </div>
      </div>
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Improvements</h4>
        {renderImprovements(feedback.improvements)}
        <div className="rounded-ds-lg border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
          Click the Highlights tab to see exact excerpts and suggestions.
        </div>
      </div>
    </div>
  );
};

const BandDiffView: React.FC<Props> = ({ essay, feedback }) => {
  const [tab, setTab] = useState('feedback');
  const errorCount = feedback.errors?.length ?? 0;
  const blockCount = feedback.blocks?.length ?? 0;
  const tabs = [
    { key: 'feedback', label: 'Feedback' },
    { key: 'highlights', label: 'Highlights' },
    { key: 'rewrite', label: 'Band 9 Rewrite' },
  ];

  useEffect(() => {
    if (tab === 'rewrite') {
      track('writing.view.band9', { errors: errorCount, blocks: blockCount });
    } else if (tab === 'highlights') {
      track('writing.view.highlights', { errors: errorCount });
    }
  }, [blockCount, errorCount, tab]);

  return (
    <Card className="space-y-6" padding="lg" insetBorder>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">AI Deep Dive</h2>
        <p className="text-sm text-muted-foreground">
          Explore detailed insights from the upgraded scorer. Switch tabs to review highlights and the polished rewrite.
        </p>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      <div className="min-h-[160px]">
        {tab === 'feedback' && <FeedbackView feedback={feedback} />}
        {tab === 'highlights' && <HighlightsView essay={essay} errors={feedback.errors} />}
        {tab === 'rewrite' && <RewriteView rewrite={feedback.band9Rewrite} />}
      </div>
    </Card>
  );
};

export default BandDiffView;

const highlightTask = (feedback: WritingFeedback) => {
  return feedback?.perCriterion ? Object.keys(feedback.perCriterion)[0] : 'unknown';
};
