// lib/http/errors.ts
export type GXErrorCode =
  | 'QUOTA_EXCEEDED'
  | 'PAYMENT_REQUIRED'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'INVALID_REQUEST';

export type GXError = {
  code: GXErrorCode;
  message: string;
  meta?: Record<string, unknown>;
};

export function sendGXError(
  res: import('next').NextApiResponse,
  status: number,
  payload: GXError
) {
  res.setHeader('X-GX-Error-Code', payload.code);
  res.status(status).json({ error: payload });
}
