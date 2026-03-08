import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  return res.status(410).json({
    error:
      'Password login is deprecated. Use email code sign-in via supabaseBrowser.auth.signInWithOtp and verifyOtp instead.',
  });
}
