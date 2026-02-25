// components/listening/cards/ResourceCard.tsx
import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';

type Level = 'beginner' | 'intermediate' | 'advanced';
type Accent = 'uk' | 'us' | 'aus' | 'mix';

type Props = {
  title: string;
  kind: 'article' | 'audio' | 'video' | 'exercise';
  level: Level;
  accent: Accent;
  topics: string[];
  href: string;
  className?: string;
};

export function ResourceCard({
  title,
  kind,
  level,
  accent,
  topics,
  href,
  className,
}: Props) {
  return (
    <Link href={href} className="block">
      <Card className={['p-4 hover:translate-y-[-1px] transition-transform', className].filter(Boolean).join(' ')}>
        <div className="flex items-start justify-between">
          <Badge>{label(kind)}</Badge>
          <div className="flex gap-2">
            <Badge variant="secondary">{label(level)}</Badge>
            <Badge variant="secondary">{accent.toUpperCase()}</Badge>
          </div>
        </div>
        <h3 className="mt-3 text-base font-semibold">{title}</h3>
        {!!topics?.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {topics.map((t) => (
              <Badge key={t} variant="outline">
                {label(t)}
              </Badge>
            ))}
          </div>
        )}
      </Card>
    </Link>
  );
}

function label(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
