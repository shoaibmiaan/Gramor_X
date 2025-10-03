// pages/api/premium/pin-status.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse<{ pinOk: boolean }>) {
  const pinOk = req.cookies?.pr_pin_ok === '1';
  return res.status(200).json({ pinOk });
}
