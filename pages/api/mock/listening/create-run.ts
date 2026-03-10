import type { NextApiRequest, NextApiResponse } from 'next';
import { respondWithIncompleteApi } from '@/lib/api/respondWithIncomplete';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return respondWithIncompleteApi({
    req,
    res,
    endpoint: '/mock/listening/create-run.ts',
    code: 'LISTENING_INCOMPLETE_MOCK_LISTENING_CREATE_RUN',
  });
}
