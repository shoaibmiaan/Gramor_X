import type { NextApiRequest, NextApiResponse } from 'next';
import { respondWithIncompleteApi } from '@/lib/api/respondWithIncomplete';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return respondWithIncompleteApi({
    req,
    res,
    endpoint: '/listening/mini/grade.ts',
    code: 'LISTENING_INCOMPLETE_LISTENING_MINI_GRADE',
  });
}
