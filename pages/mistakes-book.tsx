import React from 'react';
import dynamic from 'next/dynamic';
import { Container } from '@/components/design-system/Container';
import { useUser } from '@/hooks/useUser';

const MistakesBookPanel = dynamic(() => import('@/components/innovation/MistakesBookPanel'), { ssr: false });

export default function MistakesBookPage() {
  const { user } = useUser();
  return (
    <Container>
      <div className="py-12">
        <h1 className="font-slab text-h1 mb-4">Mistakes Book</h1>
        <p className="text-muted-foreground mb-6">Collect your errors and turn them into targeted drills.</p>
        <MistakesBookPanel userId={user?.id ?? null} onClose={() => { /* no-op */ }} />
      </div>
    </Container>
  );
}
