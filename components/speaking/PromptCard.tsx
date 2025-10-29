import { useMemo } from 'react';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import BookmarkToggle from '@/components/speaking/BookmarkToggle';
import { track } from '@/lib/analytics/track';
import type { PlanId } from '@/types/pricing';
import type { PromptRecord } from '@/types/speakingPrompts';

const PART_LABEL: Record<PromptRecord['part'], string> = {
  p1: 'Part 1',
  p2: 'Part 2',
  p3: 'Part 3',
  interview: 'Interview',
  scenario: 'Scenario',
};

interface PromptCardProps {
  prompt: PromptRecord;
  signedIn: boolean;
  plan: PlanId;
  loginHref: string;
  onBookmarkChange?: (promptId: string, bookmarked: boolean) => void;
}

export function PromptCard({ prompt, signedIn, plan, loginHref, onBookmarkChange }: PromptCardProps) {
  const practiceHref = useMemo(() => {
    const params = new URLSearchParams({
      source: 'library',
      promptSlug: prompt.slug,
      part: prompt.part,
    });
    const text = prompt.cueCard ?? prompt.question ?? prompt.topic;
    if (text) params.set('text', text);
    if (prompt.followups.length > 0) params.set('followups', prompt.followups.join('|'));
    return `/speaking/coach/free?${params.toString()}`;
  }, [prompt]);

  const mockHref = useMemo(() => {
    const params = new URLSearchParams({
      source: 'library',
      promptSlug: prompt.slug,
      part: prompt.part,
    });
    if (prompt.followups.length > 0) params.set('followups', prompt.followups.join('|'));
    return `/speaking/simulator?${params.toString()}`;
  }, [prompt]);

  const handleBookmark = (bookmarked: boolean) => {
    onBookmarkChange?.(prompt.id, bookmarked);
  };

  const handlePracticeClick = () => {
    track('prompt_started_coach', {
      prompt_slug: prompt.slug,
      part: prompt.part,
      difficulty: prompt.difficulty,
      tags: prompt.tags.join(','),
      plan,
    });
  };

  const handleMockClick = () => {
    track('prompt_started_mock', {
      prompt_slug: prompt.slug,
      part: prompt.part,
      difficulty: prompt.difficulty,
      tags: prompt.tags.join(','),
      plan,
    });
  };

  return (
    <Card className="flex h-full flex-col gap-5" padding="lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{PART_LABEL[prompt.part]}</Badge>
          <Badge variant="secondary">{prompt.difficulty}</Badge>
          {!prompt.isActive && <Badge variant="warning">Archived</Badge>}
        </div>
        <BookmarkToggle
          promptId={prompt.id}
          promptSlug={prompt.slug}
          promptPart={prompt.part}
          difficulty={prompt.difficulty}
          tags={prompt.tags}
          initialBookmarked={prompt.bookmarked ?? false}
          signedIn={signedIn}
          loginHref={loginHref}
          onToggle={handleBookmark}
        />
      </div>

      <div className="space-y-3">
        <h3 className="font-slab text-h4 leading-tight">{prompt.topic}</h3>
        {prompt.question && !prompt.cueCard && (
          <p className="text-body text-mutedText">{prompt.question}</p>
        )}
        {prompt.cueCard && (
          <p className="whitespace-pre-line rounded-ds-xl bg-border/10 p-4 text-body text-mutedText">
            {prompt.cueCard}
          </p>
        )}
      </div>

      {prompt.followups.length > 0 && (
        <div>
          <p className="text-small font-semibold text-mutedText">Follow-up ideas</p>
          <ul className="mt-2 space-y-1 text-small text-grayish">
            {prompt.followups.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-primary" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {prompt.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 text-caption text-mutedText">
          {prompt.tags.map((tag) => (
            <Badge key={tag} variant="neutral" size="xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-auto grid gap-3 sm:grid-cols-2">
        <Button
          href={practiceHref}
          onClick={handlePracticeClick}
          className="rounded-ds-xl"
        >
          Practice in Coach
        </Button>
        <Button
          href={mockHref}
          variant="secondary"
          className="rounded-ds-xl"
          onClick={handleMockClick}
        >
          Start mock
        </Button>
      </div>
    </Card>
  );
}

export default PromptCard;
