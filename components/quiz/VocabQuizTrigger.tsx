import React from 'react';
import dynamic from 'next/dynamic';

import { Button } from '@/components/design-system/Button';

const VocabQuizModal = dynamic(() => import('@/components/quiz/VocabQuizModal').then((mod) => mod.VocabQuizModal), {
  ssr: false,
  loading: () => <span className="text-xs text-muted-foreground">Loading quiz…</span>,
});

export function VocabQuizTrigger() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button size="sm" variant="secondary" className="rounded-ds-xl" onClick={() => setOpen(true)}>
        Take 60 Sec Vocab Quiz
      </Button>
      <VocabQuizModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default VocabQuizTrigger;
