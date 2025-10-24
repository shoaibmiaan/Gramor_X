import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const flushAutosave = vi.fn();
const useAutoSaveDraftMock = vi.fn(() => ({
  state: 'idle' as const,
  lastSavedAt: new Date('2024-01-01T00:00:00Z'),
  flush: flushAutosave,
}));

let currentTimeLeft = 45 * 60;
let finishCallbacks: Array<() => void> = [];
const useExamTimerMock = vi.fn(
  (_durationSeconds: number, options?: { onFinish?: () => void }) => {
    if (options?.onFinish) {
      finishCallbacks.push(options.onFinish);
    }
    return { timeLeft: currentTimeLeft };
  },
);

vi.mock('@/lib/mock/useAutoSaveDraft', () => ({
  useAutoSaveDraft: (...args: any[]) => useAutoSaveDraftMock(...(args as Parameters<typeof useAutoSaveDraftMock>)),
}));

vi.mock('@/lib/hooks/useExamTimer', () => ({
  useExamTimer: (...args: any[]) => useExamTimerMock(...(args as Parameters<typeof useExamTimerMock>)),
}));

vi.mock('@/components/writing/VoiceDraftToggle', () => ({
  default: ({ onToggle }: { onToggle: (value: boolean) => void }) => (
    <button type="button" onClick={() => onToggle(true)}>
      Voice Draft Toggle
    </button>
  ),
}));

vi.mock('@/components/writing/WritingAutosaveIndicator', () => ({
  default: ({ state }: { state: string }) => <div data-testid="autosave-state">{state}</div>,
}));

vi.mock('@/components/writing/WritingTimer', () => ({
  default: ({ seconds }: { seconds: number }) => <div>Time left: {seconds}</div>,
}));

vi.mock('@/components/exam/StickyActionBar', () => ({
  StickyActionBar: ({ left, right, children }: any) => (
    <div data-testid="sticky-action-bar">
      <div>{left}</div>
      <div>{children ?? right}</div>
    </div>
  ),
  default: ({ left, right, children }: any) => (
    <div data-testid="sticky-action-bar">
      <div>{left}</div>
      <div>{children ?? right}</div>
    </div>
  ),
}));

vi.mock('@/components/mobile/BottomActionBar', () => ({
  BottomActionBar: ({ leading, children }: any) => (
    <div data-testid="bottom-action-bar">
      <div>{leading}</div>
      <div>{children}</div>
    </div>
  ),
  default: ({ leading, children }: any) => (
    <div data-testid="bottom-action-bar">
      <div>{leading}</div>
      <div>{children}</div>
    </div>
  ),
}));

import WritingExamRoom from '@/components/writing/WritingExamRoom';

const prompts = {
  task1: {
    id: 'task1-id',
    title: 'Task 1 Overview',
    promptText: 'Describe the chart.',
  },
  task2: {
    id: 'task2-id',
    title: 'Task 2 Overview',
    promptText: 'Discuss both views.',
  },
};

declare global {
  // eslint-disable-next-line no-var
  var fetch: typeof fetch;
}

const fetchMock = vi.fn();

global.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
  flushAutosave.mockReset();
  useAutoSaveDraftMock.mockClear();
  useExamTimerMock.mockClear();
  finishCallbacks = [];
  currentTimeLeft = 45 * 60;
});

afterEach(() => {
  cleanup();
});

const renderRoom = (props: Partial<React.ComponentProps<typeof WritingExamRoom>> = {}) =>
  render(
    <WritingExamRoom
      attemptId="attempt-123"
      durationSeconds={60 * 60}
      prompts={prompts}
      {...props}
    />,
  );

describe('WritingExamRoom', () => {
  test('renders prompts, tracks word counts, and surfaces helper when below minimum', () => {
    renderRoom();

    expect(screen.getByText('Mock Writing Exam')).toBeInTheDocument();
    expect(screen.getByText('Task 1 Overview')).toBeInTheDocument();
    expect(screen.getByText('Time left: 2700')).toBeInTheDocument();

    const task1Field = screen.getByLabelText(/Task 1 response/i);
    fireEvent.change(task1Field, { target: { value: 'This is a short answer.' } });

    expect(screen.getByRole('button', { name: /Task 1 · 5 words/i })).toBeInTheDocument();
    expect(screen.getByText(/Add at least 145 more words/i)).toBeInTheDocument();

    const task2Tab = screen.getByRole('button', { name: /Task 2 · 0 words/i });
    fireEvent.click(task2Tab);

    expect(screen.getByText('Task 2 Overview')).toBeInTheDocument();
    const task2Field = screen.getByLabelText(/Task 2 response/i);
    fireEvent.change(task2Field, { target: { value: 'Extended arguments build cohesion.' } });

    expect(screen.getByRole('button', { name: /Task 2 · 4 words/i })).toBeInTheDocument();
  });

  test('submits essays to the API and invokes success callback', async () => {
    const onSubmitSuccess = vi.fn();
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ attemptId: 'attempt-123', results: { task1: { band: 7 } } }),
    } as Response);

    renderRoom({ onSubmitSuccess });

    fireEvent.change(screen.getByLabelText(/Task 1 response/i), {
      target: { value: 'An overview of the major trends in the chart.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Task 2 · 0 words/i }));
    fireEvent.change(screen.getByLabelText(/Task 2 response/i), {
      target: { value: 'I strongly agree with the proposed policies for urban planning.' },
    });

    const submitButton = screen.getAllByRole('button', { name: /Submit for scoring/i })[0];
    fireEvent.click(submitButton);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const request = fetchMock.mock.calls[0];
    expect(request[0]).toBe('/api/mock/writing/submit');
    const body = JSON.parse((request[1] as RequestInit).body as string);
    expect(body).toMatchObject({
      attemptId: 'attempt-123',
      durationSeconds: 60 * 60,
      tasks: {
        task1: { essay: expect.stringContaining('overview of the major trends'), promptId: 'task1-id' },
        task2: { essay: expect.stringContaining('strongly agree'), promptId: 'task2-id' },
      },
    });

    await waitFor(() => expect(onSubmitSuccess).toHaveBeenCalledWith({
      attemptId: 'attempt-123',
      results: { task1: { band: 7 } },
    }));

    expect(flushAutosave).toHaveBeenCalled();
  });

  test('auto submits when timer finishes and surfaces failure message', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Autosubmit failed' }),
    } as Response);

    renderRoom();

    expect(finishCallbacks).toHaveLength(1);
    await finishCallbacks[0]!();

    await waitFor(() => {
      expect(screen.getByText(/Time elapsed\. We attempted to auto-submit/i)).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
