// pages/api/premium/verify.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import verifyPin from './verify-pin';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return verifyPin(req, res);
}
