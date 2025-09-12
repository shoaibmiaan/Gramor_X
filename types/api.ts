// types/api.ts
// Shared API result helpers

export type ApiResult<T> = ({ ok: true } & T) | { ok: false; error: string };

// Narrowing helper
export function isOk<T>(r: ApiResult<T>): r is { ok: true } & T {
  return r.ok === true;
}
