import React from 'react';
import dynamic from 'next/dynamic';
import { Container } from '@/components/design-system/Container';

const AICoachPanel = dynamic(() => import('@/components/innovation/AICoachPanel'), { ssr: false });

export default function AICoachPage() {
  return (
    <Container>
      <div className="py-12">
        <h1 className="font-slab text-h1 mb-4">AI Coach</h1>
        <p className="text-muted-foreground mb-6">Get personalised, actionable feedback to close your gaps fast.</p>
        <div>
          <AICoachPanel onClose={() => { /* navigate back or close modal */ }} />
        </div>
      </div>
    </Container>
  );
}

