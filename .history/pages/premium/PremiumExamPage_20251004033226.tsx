// pages/premium/PremiumExamPage.tsx
import * as React from 'react';
import { PremiumRoom } from '@/premium-ui/access/PremiumRoom';
import { ExamShell } from '@/premium-ui/exam/ExamShell';
import { Scratchpad } from '@/premium-ui/exam/Scratchpad';
import { MediaDock } from '@/premium-ui/exam/MediaDock';

export default function PremiumExamPage() {
  return (
    <PremiumRoom>
      <ExamShell
        title="Premium Mock Test"
        totalQuestions={0}
        currentQuestion={0}
      >
        <div className="p-4">Premium exam scaffold</div>
        <MediaDock />
        <Scratchpad />
      </ExamShell>
    </PremiumRoom>
  );
}
