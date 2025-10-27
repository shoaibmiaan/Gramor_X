export function calcWpm(wordCount: number, timeSpentMs: number): number {
  if (timeSpentMs <= 0) return 0;
  const minutes = timeSpentMs / 60000;
  if (minutes <= 0) return 0;
  return Math.round((wordCount / minutes) * 10) / 10;
}

export function calcTtr(text: string): number {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return 0;
  const unique = new Set(tokens);
  return Math.round((unique.size / tokens.length) * 100) / 100;
}
