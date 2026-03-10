import type { NextApiRequest, NextApiResponse } from 'next';

type IncompleteApiArgs = {
  req: NextApiRequest;
  res: NextApiResponse;
  endpoint: string;
  code: string;
};

export function respondWithIncompleteApi({ req, res, endpoint, code }: IncompleteApiArgs) {
  const telemetry = {
    tag: 'api_incomplete',
    domain: 'listening',
    endpoint,
    method: req.method ?? 'UNKNOWN',
    code,
  };

  console.warn('[telemetry] incomplete_api_called', telemetry);

  res.setHeader('X-GramorX-Telemetry-Tag', telemetry.tag);
  res.status(501).json({
    error: 'Not available yet',
    code,
    domain: telemetry.domain,
    endpoint: telemetry.endpoint,
    telemetryTag: telemetry.tag,
  });
}
