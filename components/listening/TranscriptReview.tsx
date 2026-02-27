import React, { useMemo } from 'react';

import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';

type Section = {
  order: number;
  title?: string | null;
  transcript?: string | null;
};

type QuestionStatus = {
  qno: number;
  ok: boolean;
  unanswered: boolean;
};

type Props = {
  sections: Section[];
  questionStatuses: QuestionStatus[];
  sectionAssignments: Map<number, number | null>;
  className?: string;
};

function badgeVariant(status: QuestionStatus) {
  if (status.ok) return 'primary';
  if (status.unanswered) return 'warning';
  return 'danger';
}

const TranscriptReview: React.FC<Props> = ({
  sections,
  questionStatuses,
  sectionAssignments,
  className = '',
}) => {
  const enrichedSections = useMemo(() => {
    return sections
      .map((section) => ({
        ...section,
        questions: questionStatuses
          .filter((status) => sectionAssignments.get(status.qno) === section.order)
          .sort((a, b) => a.qno - b.qno),
      }))
      .filter((section) => typeof section.order === 'number')
      .sort((a, b) => a.order - b.order);
  }, [sections, questionStatuses, sectionAssignments]);

  const hasTranscript = enrichedSections.some((section) => (section.transcript ?? '').trim().length > 0);

  if (!enrichedSections.length || !hasTranscript) return null;

  return (
    <Card className={`card-surface rounded-ds-2xl p-6 ${className}`}>
      <div className="flex flex-col gap-2">
        <h3 className="text-h4 font-semibold">Transcripts</h3>
        <p className="text-small text-muted-foreground">
          Review the audio transcripts and see which questions were associated with each section.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        {enrichedSections.map((section) => {
          const transcript = (section.transcript ?? '').trim();
          return (
            <div
              key={section.order}
              className="rounded-ds-xl border border-lightBorder/60 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-small uppercase tracking-wide text-muted-foreground">Section {section.order}</p>
                  {section.title ? <h4 className="text-body font-semibold">{section.title}</h4> : null}
                </div>

                {section.questions.length ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {section.questions.map((status) => (
                      <Badge key={status.qno} variant={badgeVariant(status)} size="sm">
                        Q{status.qno}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-3 whitespace-pre-wrap text-small leading-relaxed text-gray-900 dark:text-white/80">
                {transcript || 'Transcript not available for this section.'}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default TranscriptReview;

