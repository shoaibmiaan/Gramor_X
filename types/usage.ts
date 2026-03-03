export type UsageKey =
  | 'ai.writing.grade'
  | 'ai.speaking.grade'
  | 'ai.explain'
  | 'mock.start'
  | 'mock.submit';

export type Feature =
  | 'ai.explain'
  | 'ai.summary'
  | 'ai.recommend'
  | 'ai.profile_suggest'
  | 'ai.next_item'
  | 'ai.writing.score'
  | 'ai.speaking.evaluate'
  | 'ai.chat'
  | string;

export type UsageRecord = Readonly<{
  id?: string;
  user_id: string;
  feature: Feature;
  requests: number;
  tokens: number;
  date: string;
  created_at?: string;
  updated_at?: string;
}>;

export type UsageLimit = Readonly<{
  feature: Feature;
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

export type UsageGuardResult = Readonly<{
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  feature: Feature;
}>;

export type GXErrorPayload = Readonly<{
  error?: {
    code: string;
    message: string;
    meta?: Record<string, unknown>;
  };
}>;
