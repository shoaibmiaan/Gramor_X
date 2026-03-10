import type { NextApiRequest, NextApiResponse } from 'next';
import { respondWithIncompleteApi } from '@/lib/api/respondWithIncomplete';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return respondWithIncompleteApi({
    req,
    res,
    endpoint: '/dev/seed/listening-one.ts',
    code: 'LISTENING_INCOMPLETE_DEV_SEED_LISTENING_ONE',
  });
}
