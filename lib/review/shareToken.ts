import jwt from 'jsonwebtoken';

import { env } from '@/lib/env';

const DEFAULT_TTL_HOURS = 72;
const DEFAULT_PROGRESS_TTL_HOURS = 168;

function resolveSecret(): string {
  const secret =
    process.env.REVIEW_SHARE_SECRET || env.REVIEW_SHARE_SECRET || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      'Missing REVIEW_SHARE_SECRET or Supabase service role key for review share tokens.',
    );
  }
  return secret;
}

export type ReviewSharePayload = {
  attemptId: string;
  scope: 'review-share';
  exp?: number;
};

export type ProgressSharePayload = {
  userId: string;
  scope: 'progress-share';
  exp?: number;
};

export type CreateShareTokenResult = {
  token: string;
  expiresAt: Date;
  ttlHours: number;
};

export function createReviewShareToken(
  attemptId: string,
  ttlHoursInput?: number,
): CreateShareTokenResult {
  if (!attemptId) {
    throw new Error('Attempt id is required');
  }

  const ttlHours = Math.max(
    1,
    Math.floor(ttlHoursInput ?? env.REVIEW_SHARE_TTL_HOURS ?? DEFAULT_TTL_HOURS),
  );
  const expiresInSeconds = ttlHours * 3600;
  const secret = resolveSecret();

  const token = jwt.sign(
    { attemptId, scope: 'review-share' } satisfies ReviewSharePayload,
    secret,
    { expiresIn: expiresInSeconds },
  );

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  return { token, expiresAt, ttlHours };
}

export type VerifyShareTokenResult = {
  attemptId: string;
  expiresAt: Date;
};

export type VerifyProgressShareTokenResult = {
  userId: string;
  expiresAt: Date;
};

export function verifyReviewShareToken(token: string): VerifyShareTokenResult {
  if (!token) {
    throw new Error('Token missing');
  }
  const secret = resolveSecret();
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload & ReviewSharePayload;

  if (!decoded || decoded.scope !== 'review-share' || typeof decoded.attemptId !== 'string') {
    throw new Error('Invalid share token');
  }
  if (typeof decoded.exp !== 'number') {
    throw new Error('Malformed share token');
  }

  return { attemptId: decoded.attemptId, expiresAt: new Date(decoded.exp * 1000) };
}

export function isShareTokenExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

export function getShareTokenTtlHours(): number {
  return Math.max(1, Math.floor(env.REVIEW_SHARE_TTL_HOURS ?? DEFAULT_TTL_HOURS));
}

export function createProgressShareToken(
  userId: string,
  ttlHoursInput?: number,
): CreateShareTokenResult {
  if (!userId) {
    throw new Error('User id is required');
  }

  const ttlHours = Math.max(
    1,
    Math.floor(ttlHoursInput ?? env.PROGRESS_SHARE_TTL_HOURS ?? DEFAULT_PROGRESS_TTL_HOURS),
  );
  const expiresInSeconds = ttlHours * 3600;
  const secret = resolveSecret();

  const token = jwt.sign(
    { userId, scope: 'progress-share' } satisfies ProgressSharePayload,
    secret,
    { expiresIn: expiresInSeconds },
  );

  return {
    token,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    ttlHours,
  };
}

export function verifyProgressShareToken(token: string): VerifyProgressShareTokenResult {
  if (!token) {
    throw new Error('Token missing');
  }

  const secret = resolveSecret();
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload & ProgressSharePayload;

  if (!decoded || decoded.scope !== 'progress-share' || typeof decoded.userId !== 'string') {
    throw new Error('Invalid share token');
  }
  if (typeof decoded.exp !== 'number') {
    throw new Error('Malformed share token');
  }

  return { userId: decoded.userId, expiresAt: new Date(decoded.exp * 1000) };
}

export function getProgressShareTokenTtlHours(): number {
  return Math.max(1, Math.floor(env.PROGRESS_SHARE_TTL_HOURS ?? DEFAULT_PROGRESS_TTL_HOURS));
}
