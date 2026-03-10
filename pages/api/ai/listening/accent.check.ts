import type { NextApiRequest, NextApiResponse } from 'next';
import { respondWithIncompleteApi } from '@/lib/api/respondWithIncomplete';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return respondWithIncompleteApi({
    req,
    res,
    endpoint: '/ai/listening/accent.check.ts',
    code: 'LISTENING_INCOMPLETE_AI_LISTENING_ACCENT_CHECK',
  });
}
