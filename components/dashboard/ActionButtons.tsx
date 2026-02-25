import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/design-system/Button';

interface ActionButtonsProps {
  onShareDashboard: () => void;
  speakingVocabSlug: string;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onShareDashboard,
  speakingVocabSlug,
}) => {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Link href="/learning">
        <Button variant="primary" className="rounded-ds-xl">
          Start today’s lesson
        </Button>
      </Link>
      <Link href="/mock">
        <Button variant="secondary" className="rounded-ds-xl">
          Take a mock test
        </Button>
      </Link>
      <Link href="/writing">
        <Button variant="accent" className="rounded-ds-xl">
          Practice writing
        </Button>
      </Link>
      <Link href="/reading">
        <Button variant="secondary" className="rounded-ds-xl">
          Practice reading
        </Button>
      </Link>
      <Link href={`/vocabulary/speaking/${speakingVocabSlug}`}>
        <Button variant="secondary" className="rounded-ds-xl">
          Speaking vocab today
        </Button>
      </Link>
      <Link href="/progress">
        <Button variant="ghost" className="rounded-ds-xl">
          Review progress report
        </Button>
      </Link>
      <Link href="#visa-target">
        <Button variant="ghost" className="rounded-ds-xl">
          Check visa target
        </Button>
      </Link>
      <Button onClick={onShareDashboard} variant="secondary" className="rounded-ds-xl">
        Share progress
      </Button>
    </div>
  );
};