// components/writing/WritingPromptCard.tsx
// Displays prompt metadata alongside quick stats.

import React from 'react';
import { Badge } from '@/components/design-system/Badge';
import { Card } from '@/components/design-system/Card';
import type { WritingPrompt } from '@/types/writing';

type Props = {
  prompt: WritingPrompt;
  actions?: React.ReactNode;
};

export const WritingPromptCard: React.FC<Props> = ({ prompt, actions }) => {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{prompt.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="subtle">{prompt.taskType.toUpperCase()}</Badge>
            <Badge variant="outline">{prompt.module === 'academic' ? 'Academic' : 'General Training'}</Badge>
            <Badge variant="ghost">{prompt.difficulty}</Badge>
            {prompt.wordTarget && <span>{prompt.wordTarget} words</span>}
            {prompt.estimatedMinutes && <span>{prompt.estimatedMinutes} min</span>}
          </div>
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{prompt.promptText}</p>
      {prompt.tags && prompt.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {prompt.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="bg-muted/30">
              #{tag}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
};

export default WritingPromptCard;
