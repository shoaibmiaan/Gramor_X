import type { NextApiRequest } from 'next';

export function getRequestId(req: NextApiRequest): string | undefined {
  const header = req.headers['x-request-id'] ?? req.headers['x-vercel-id'] ?? req.headers['traceparent'];
  if (!header) return undefined;
  if (Array.isArray(header)) return header[0];
  return header;
}

export function getClientIp(req: NextApiRequest): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) return forwarded[0]?.split(',')[0]?.trim();
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim();
  return req.socket?.remoteAddress ?? undefined;
}
