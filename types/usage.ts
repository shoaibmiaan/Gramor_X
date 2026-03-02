export type UsageKey =
  | 'ai.writing.grade'
  | 'ai.speaking.grade'
  | 'ai.explain'
  | 'mock.start'
  | 'mock.submit';

export type UsageRecord = Readonly<{
  key: UsageKey;
  count: number;
  dateISO: string;
}>;

export type UsageLimit = Readonly<{
  key: UsageKey;
  limit: number;
}>;

export type IncrementReq = Readonly<{ key: UsageKey; step?: number; dateISO?: string }>;

export type IncrementSuccessResponse = Readonly<{ ok: true; key: UsageKey; dateISO: string; count: number }>;

export type IncrementErrorResponse = Readonly<{ ok: false; error: string }>;

export type IncrementRes = IncrementSuccessResponse | IncrementErrorResponse;

export type UsageDecisionReason = 'limit_reached' | 'counter_unavailable';

export type UsageDecision = Readonly<{
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  reason?: UsageDecisionReason;
}>;

export type LimitExceededPayload = Readonly<{ error: string; limit: number }>;

export type GXErrorPayload = Readonly<{
  error?: {
    code: string;
    message: string;
    meta?: Record<string, unknown>;
  };
}>;
