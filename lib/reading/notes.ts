export type NoteRange = { start: number; end: number };
export type ServerNote = { id: string; text: string; ranges: NoteRange[] };

export const mapServerNote = (n: any): ServerNote => ({
  id: String(n?.id ?? ''),
  text: String(n?.text ?? ''),
  ranges: Array.isArray(n?.ranges)
    ? n.ranges
        .map((r: any) => ({
          start: Number(r?.start ?? 0),
          end: Number(r?.end ?? 0),
        }))
        .filter(r => Number.isFinite(r.start) && Number.isFinite(r.end) && r.end > r.start)
    : [],
});
