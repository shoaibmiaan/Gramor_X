import type { ReadingAnswer } from './answers';

export const normalizeForPersist = (answers: Record<string, ReadingAnswer | undefined>) =>
  Object.fromEntries(
    Object.entries(answers).map(([k, v]) => [
      k,
      typeof v === 'string' ? { value: v } : { value: v?.value ?? '', flagged: !!v?.flagged },
    ])
  );
