export const diffAnswers = (prev: Record<string, unknown>, next: Record<string, unknown>) => {
  const delta: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
  for (const k of keys) {
    const a = prev?.[k];
    const b = next?.[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) delta[k] = b;
  }
  return delta;
};
