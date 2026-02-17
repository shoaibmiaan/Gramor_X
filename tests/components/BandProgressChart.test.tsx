import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeAll, describe, expect, test } from 'vitest';

import BandProgressChart from '@/components/writing/BandProgressChart';
import type { CriterionDelta, WritingProgressPoint } from '@/types/analytics';

const points: WritingProgressPoint[] = [
  {
    attemptId: 'attempt-1',
    createdAt: '2024-01-01T00:00:00Z',
    overallBand: 6,
    bandScores: {
      task_response: 6,
      coherence_and_cohesion: 6,
      lexical_resource: 6,
      grammatical_range: 6,
    },
  },
  {
    attemptId: 'attempt-2',
    createdAt: '2024-02-01T00:00:00Z',
    overallBand: 7,
    bandScores: {
      task_response: 7,
      coherence_and_cohesion: 7,
      lexical_resource: 7,
      grammatical_range: 7,
    },
  },
];

const deltas: CriterionDelta[] = [
  { criterion: 'overall', current: 7, previous: 6, delta: 1 },
  { criterion: 'task_response', current: 7, previous: 6, delta: 1 },
  { criterion: 'coherence_and_cohesion', current: 7, previous: 6, delta: 1 },
  { criterion: 'lexical_resource', current: 7, previous: 6, delta: 1 },
  { criterion: 'grammatical_range', current: 7, previous: 6, delta: 1 },
];

beforeAll(() => {
  class ResizeObserverMock {
    observe() {
      return undefined;
    }
    unobserve() {
      return undefined;
    }
    disconnect() {
      return undefined;
    }
  }
  (globalThis as any).ResizeObserver = ResizeObserverMock;
});

describe('BandProgressChart', () => {
  test('renders chart heading and stats', () => {
    render(<BandProgressChart points={points} deltas={deltas} />);
    expect(screen.getByText('Your Improvement Journey')).toBeInTheDocument();
    const bands = screen.getAllByText(/Current band 7.0/);
    expect(bands.length).toBeGreaterThan(0);
  });
});
