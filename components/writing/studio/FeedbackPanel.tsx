import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import type { FeedbackJson } from '@/lib/writing/schemas';

export type FeedbackPanelProps = {
  feedback: FeedbackJson | null | undefined;
};

export const FeedbackPanel = ({ feedback }: FeedbackPanelProps) => {
  if (!feedback) {
    return (
      <Card className="space-y-2" padding="lg">
        <h2 className="text-lg font-semibold text-foreground">Feedback</h2>
        <p className="text-sm text-muted-foreground">Detailed feedback will appear once scoring completes.</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4" padding="lg">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Feedback</h2>
        {feedback.highlights && feedback.highlights.length > 0 && (
          <Badge variant="soft" tone="success" size="sm">
            {feedback.highlights.length} highlight{feedback.highlights.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {feedback.highlights && feedback.highlights.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Highlights</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
            {feedback.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {feedback.fixes && feedback.fixes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Fix this next</h3>
          <ul className="space-y-3">
            {feedback.fixes.map((fix) => (
              <li key={fix.title} className="rounded-2xl border border-border/60 bg-card/70 p-4">
                <p className="text-sm font-semibold text-foreground">{fix.title}</p>
                <p className="text-sm text-muted-foreground">{fix.why}</p>
                {fix.example && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Example:</span> {fix.example}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!feedback.highlights && (!feedback.fixes || feedback.fixes.length === 0) && (
        <p className="text-sm text-muted-foreground">Keep practising—actionable feedback will appear soon.</p>
      )}
    </Card>
  );
};
