import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, test } from 'vitest';

import BandDiffView from '@/components/writing/BandDiffView';
import type { WritingFeedback } from '@/types/writing';

const feedback: WritingFeedback = {
  summary: 'Solid effort.',
  strengths: ['Good ideas'],
  improvements: ['Work on grammar'],
  perCriterion: {
    task_response: { band: 6, feedback: 'Adequate coverage.' },
    coherence_and_cohesion: { band: 6, feedback: 'Linking could improve.' },
    lexical_resource: { band: 6, feedback: 'Range is decent.' },
    grammatical_range: { band: 5.5, feedback: 'Proofread for errors.' },
  },
  band9Rewrite: 'Improved essay content.',
  errors: [
    {
      type: 'grammar',
      excerpt: 'sample error',
      suggestion: 'Fix grammar.',
      severity: 'medium',
      startOffset: 0,
      endOffset: 6,
    },
  ],
  blocks: [],
};

describe('BandDiffView', () => {
  test('renders summary by default', () => {
    render(<BandDiffView essay="sample error text" feedback={feedback} />);
    expect(screen.getByText('Solid effort.')).toBeInTheDocument();
  });

  test('switching to rewrite shows text', () => {
    render(<BandDiffView essay="sample error text" feedback={feedback} />);
    const [rewriteTab] = screen.getAllByRole('button', { name: 'Band 9 Rewrite' });
    fireEvent.click(rewriteTab);
    expect(screen.getByText('Improved essay content.')).toBeInTheDocument();
  });
});
