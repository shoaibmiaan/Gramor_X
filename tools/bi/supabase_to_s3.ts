// tools/bi/supabase_to_s3.ts
// Standalone script to mirror the analytics export to S3 for downstream BI jobs.
// Usage: `tsx tools/bi/supabase_to_s3.ts [--org <orgId>]`

import { createInterface } from 'node:readline/promises';
import { stderr, stdin, stdout } from 'node:process';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

import { loadWritingAttemptRows } from '@/lib/exports/writingAttempts';
import { writingAttemptsToParquet } from '@/lib/exports/parquet';

function parseArgs(): { orgId: string | null } {
  const orgIndex = process.argv.indexOf('--org');
  if (orgIndex >= 0 && process.argv[orgIndex + 1]) {
    return { orgId: process.argv[orgIndex + 1] };
  }
  return { orgId: null };
}

async function ensureConsent(): Promise<boolean> {
  if (stdout.isTTY) return true;
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question('Proceed with export upload? (y/N) ');
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

async function main() {
  const { orgId } = parseArgs();

  const bucket = requireEnv('BI_EXPORT_BUCKET');
  const region = requireEnv('AWS_REGION');
  const accessKeyId = requireEnv('AWS_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('AWS_SECRET_ACCESS_KEY');
  const prefix = process.env.BI_EXPORT_PREFIX?.replace(/^\/+|\/+$/g, '') ?? 'analytics';

  if (!(await ensureConsent())) {
    stderr.write('Aborted by user.\n');
    process.exit(1);
    return;
  }

  const rows = await loadWritingAttemptRows({ limit: 50_000, orgId });
  const buffer = await writingAttemptsToParquet(rows);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const keyParts = [prefix, `writing-analytics-${timestamp}.parquet`].filter(Boolean);
  const key = keyParts.join('/');

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/octet-stream',
    }),
  );

  stdout.write(`Uploaded ${rows.length} rows to s3://${bucket}/${key}\n`);
}

main().catch((error) => {
  console.error('[bi] export failed', error);
  process.exit(1);
});
