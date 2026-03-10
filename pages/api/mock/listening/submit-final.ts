import type { NextApiRequest, NextApiResponse } from 'next';
import { respondWithIncompleteApi } from '@/lib/api/respondWithIncomplete';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return respondWithIncompleteApi({
    req,
    res,
    endpoint: '/mock/listening/submit-final.ts',
    code: 'LISTENING_INCOMPLETE_MOCK_LISTENING_SUBMIT_FINAL',
  });
}
