import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

import WritingExamRoom from '../../components/writing/WritingExamRoom';

const prompts = {
  task1: {
    id: 'p1',
    slug: 'p1',
    title: 'Task 1 prompt',
    promptText: 'Describe the chart provided.',
    taskType: 'task1' as const,
    module: 'academic' as const,
    difficulty: 'medium' as const,
    tags: ['charts'],
  },
  task2: {
    id: 'p2',
    slug: 'p2',
    title: 'Task 2 prompt',
    promptText: 'Discuss both views and give your opinion.',
    taskType: 'task2' as const,
    module: 'academic' as const,
    difficulty: 'medium' as const,
    tags: ['opinion'],
  },
};

describe('WritingExamRoom', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn(async (url: any, options: any) => {
      if (typeof url === 'string' && url.includes('save-draft')) {
        return {
          ok: true,
          json: async () => ({ ok: true, savedAt: new Date().toISOString() }),
        } as any;
      }
      if (typeof url === 'string' && url.includes('submit')) {
        return {
          ok: true,
          json: async () => ({ ok: true, attemptId: 'attempt-1', results: {} }),
        } as any;
      }
      throw new Error(`Unhandled fetch call: ${url}`);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  it('autosaves typing and submits responses', async () => {
    const onSubmit = vi.fn();
    render(
      <WritingExamRoom
        attemptId="attempt-1"
        prompts={prompts}
        durationSeconds={3600}
        onSubmitSuccess={onSubmit}
      />,
    );

    const textarea = screen.getByLabelText(/Task 1 response/i);
    fireEvent.change(textarea, { target: { value: 'This is a detailed description of the chart provided in the exam.' } });

    await vi.advanceTimersByTimeAsync(2000);

    const submitButton = screen.getByRole('button', { name: /submit for scoring/i });
    fireEvent.click(submitButton);

    await vi.advanceTimersByTimeAsync(0);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/mock/writing/save-draft',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/mock/writing/submit',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(onSubmit).toHaveBeenCalled();
  });
});
