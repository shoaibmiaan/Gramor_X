import type { NextApiRequest, NextApiResponse } from 'next';

import { getClientIp, getRequestId } from '@/lib/api/requestContext';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { token } = req.query;
  if (typeof token !== 'string') {
    res.status(400).json({ error: 'Invalid token' });
    return;
  }

  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);
  const logger = createRequestLogger('api/writing/reports/download', { requestId, clientIp });

  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { data: report, error } = await supabase
    .from('writing_band_reports')
    .select('pdf, user_id, created_at')
    .eq('download_token', token)
    .maybeSingle();

  if (error) {
    logger.error('failed to load band report', { error: error.message, token });
    res.status(500).json({ error: error.message });
    return;
  }

  if (!report || report.user_id !== user.id) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  const pdfBuffer = Buffer.isBuffer(report.pdf)
    ? (report.pdf as Buffer)
    : Buffer.from((report.pdf as string) ?? '', 'base64');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="band-report-${report.created_at ?? 'latest'}.pdf"`);
  res.send(pdfBuffer);
}
