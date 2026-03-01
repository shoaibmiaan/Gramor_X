import type { NextApiRequest, NextApiResponse } from 'next';
import signoutHandler from './signout';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return signoutHandler(req, res);
}
