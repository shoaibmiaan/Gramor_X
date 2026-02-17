import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import WritingEditor, { type WritingPaper } from '@/components/writing/Editor';
import { serializeDraft, type WritingDraftRecord } from '@/lib/storage/drafts';

const paperA: WritingPaper = {
  id: 'paper-a',
  task1: {
    title: 'Task 1A',
    prompt: 'Prompt A1',
    minWords: 150,
  },
  task2: {
    title: 'Task 2A',
    prompt: 'Prompt A2',
    minWords: 250,
  },
};

const paperB: WritingPaper = {
  id: 'paper-b',
  task1: {
    title: 'Task 1B',
    prompt: 'Prompt B1',
    minWords: 150,
  },
  task2: {
    title: 'Task 2B',
    prompt: 'Prompt B2',
    minWords: 250,
  },
};

let uuidCounter = 0;

beforeEach(() => {
  vi.restoreAllMocks();
  uuidCounter = 0;
  window.localStorage.clear();

  const randomUUID = vi.fn(() => {
    uuidCounter += 1;
    return `attempt-${uuidCounter}`;
  });

  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID },
    configurable: true,
    writable: true,
  });

  global.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ ok: true }),
  })) as unknown as typeof fetch;
});

describe('WritingEditor draft lifecycle', () => {
  test('resets state and attempt when switching to a different paper', async () => {
    const { rerender } = render(<WritingEditor paper={paperA} />);

    const [task1Input] = screen.getAllByRole('textbox');
    fireEvent.change(task1Input, { target: { value: 'Essay for paper A' } });
    fireEvent.blur(task1Input);

    await waitFor(() => {
      expect(window.localStorage.getItem('writing:paper-a')).not.toBeNull();
    });

    const draftA = JSON.parse(window.localStorage.getItem('writing:paper-a')!);
    expect(draftA.content.task1).toBe('Essay for paper A');
    const attemptA = draftA.attemptId;

    rerender(<WritingEditor paper={paperB} />);

    await waitFor(() => {
      const [task1AfterSwitch] = screen.getAllByRole('textbox');
      expect(task1AfterSwitch).toHaveValue('');
    });

    const [task1ForB] = screen.getAllByRole('textbox');
    fireEvent.change(task1ForB, { target: { value: 'Essay for paper B' } });
    fireEvent.blur(task1ForB);

    await waitFor(() => {
      expect(window.localStorage.getItem('writing:paper-b')).not.toBeNull();
    });

    const draftB = JSON.parse(window.localStorage.getItem('writing:paper-b')!);
    expect(draftB.content.task1).toBe('Essay for paper B');
    expect(draftB.attemptId).not.toBe(attemptA);
  });

  test('restores the correct draft for a new storage key when confirmed', async () => {
    const { rerender } = render(<WritingEditor paper={paperA} />);

    const [task1Input] = screen.getAllByRole('textbox');
    fireEvent.change(task1Input, { target: { value: 'Original paper A essay' } });
    fireEvent.blur(task1Input);

    await waitFor(() => {
      expect(window.localStorage.getItem('writing:paper-a')).not.toBeNull();
    });

    const draftA = JSON.parse(window.localStorage.getItem('writing:paper-a')!);

    const storedDraftB: WritingDraftRecord = {
      attemptId: 'existing-paper-b',
      startedAt: 1_000,
      updatedAt: 2_000,
      syncedAt: 1_500,
      content: {
        task1: 'Saved response for paper B',
        task2: 'Saved essay for paper B',
        task1WordCount: 4,
        task2WordCount: 5,
      },
    };
    window.localStorage.setItem('writing:paper-b', serializeDraft(storedDraftB));

    rerender(<WritingEditor paper={paperB} />);

    const restoreButton = await screen.findByRole('button', { name: 'Restore' });
    expect(screen.getByRole('dialog', { name: 'Resume draft?' })).toBeInTheDocument();

    const [task1BeforeRestore, task2BeforeRestore] = screen.getAllByRole('textbox');
    expect(task1BeforeRestore).toHaveValue('');
    expect(task2BeforeRestore).toHaveValue('');

    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const [task1AfterRestore, task2AfterRestore] = screen.getAllByRole('textbox');
    expect(task1AfterRestore).toHaveValue('Saved response for paper B');
    expect(task2AfterRestore).toHaveValue('Saved essay for paper B');

    fireEvent.blur(task1AfterRestore);

    await waitFor(() => {
      expect(window.localStorage.getItem('writing:paper-b')).not.toBeNull();
    });

    const draftB = JSON.parse(window.localStorage.getItem('writing:paper-b')!);
    expect(draftB.attemptId).toBe(storedDraftB.attemptId);
    expect(draftB.content.task1).toBe('Saved response for paper B');
    expect(JSON.parse(window.localStorage.getItem('writing:paper-a')!).attemptId).toBe(draftA.attemptId);
  });
});
