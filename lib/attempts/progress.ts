import type { AttemptProgressRecord, AttemptProgressRequest, AttemptProgressResult } from '@/types/api/progress';
import type { ModuleKey } from '@/types/attempts';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

const toSearchParams = (query: Record<string, string | number | boolean | undefined>): string => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export async function saveAttemptProgress<TDraft = unknown>(
  attemptId: string,
  payload: AttemptProgressRequest<TDraft>,
): Promise<AttemptProgressResult<TDraft>> {
  try {
    const res = await fetch(`/api/attempts/${encodeURIComponent(attemptId)}/progress`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as AttemptProgressResult<TDraft>;
    if (!res.ok) {
      return json.ok ? { ok: false, error: 'Failed to save progress' } : json;
    }
    return json;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to save progress' };
  }
}

export async function getAttemptProgress<TDraft = unknown>(
  attemptId: string,
  opts: { module?: ModuleKey; includeCompleted?: boolean; mockId?: string } = {},
): Promise<AttemptProgressResult<TDraft> | { ok: true; progress: null }> {
  try {
    const res = await fetch(
      `/api/attempts/${encodeURIComponent(attemptId)}/progress${toSearchParams({
        module: opts.module,
        includeCompleted: opts.includeCompleted ? 'true' : undefined,
        mockId: opts.mockId,
      })}`,
    );
    const json = (await res.json()) as
      | AttemptProgressResult<TDraft>
      | { ok: true; progress: null }
      | { ok: false; error: string };
    if (!res.ok) {
      return json && typeof json === 'object' && 'ok' in json ? json : { ok: false, error: 'Failed to load progress' };
    }
    return json as AttemptProgressResult<TDraft> | { ok: true; progress: null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to load progress' };
  }
}

export async function getLatestAttemptProgress<TDraft = unknown>(
  opts: { module?: ModuleKey; includeCompleted?: boolean; mockId?: string } = {},
): Promise<{ ok: true; progress: AttemptProgressRecord<TDraft> | null } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `/api/attempts/progress${toSearchParams({
        module: opts.module,
        includeCompleted: opts.includeCompleted ? 'true' : undefined,
        mockId: opts.mockId,
      })}`,
    );
    const json = (await res.json()) as
      | { ok: true; progress: AttemptProgressRecord<TDraft> | null }
      | { ok: false; error: string };
    if (!res.ok) {
      return json && typeof json === 'object' && 'ok' in json ? json : { ok: false, error: 'Failed to load progress' };
    }
    return json;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to load progress' };
  }
}
