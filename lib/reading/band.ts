export function readingBandFromRaw(correct: number, total: number): number {
  if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  const ratio = Math.max(0, Math.min(1, correct / total));
  const band = 4 + ratio * 5;
  return Math.round((band + Number.EPSILON) * 10) / 10;
}
