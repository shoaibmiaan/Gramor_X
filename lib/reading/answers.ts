export type ReadingAnswer =
  | string
  | { value: string; flagged?: boolean | null };

export const getAnswerText = (a: ReadingAnswer | null | undefined): string =>
  typeof a === 'string' ? a : (a?.value ?? '');

export const isFlagged = (a: ReadingAnswer | null | undefined): boolean =>
  typeof a === 'object' && !!a?.flagged;
