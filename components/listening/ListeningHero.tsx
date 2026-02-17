// components/listening/ListeningHero.tsx
import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';

export function ListeningHero() {
  return (
    <div className="flex flex-col gap-4">
      <Badge>IELTS • Listening</Badge>
      <h1 className="text-2xl md:text-3xl font-semibold">
        Listening Tips & Resources
      </h1>
      <p className="opacity-80 max-w-2xl">
        Level-based strategies, practice drills, and AI tools to master IELTS Listening
        — Academic & General. Start where you are, and level up fast.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Link href="/tools/listening/dictation" className="inline-flex">
          <Button>Try AI Dictation</Button>
        </Link>
        <Link href="/mock/listening/start" className="inline-flex">
          <Button variant="secondary">Begin a Mock</Button>
        </Link>
      </div>
    </div>
  );
}
