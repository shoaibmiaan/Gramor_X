import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(url, serviceKey);

const [, , userId, start, end] = process.argv;

if (!userId || !start || !end) {
  console.error('Usage: tsx tools/ops/export-backup.ts <userId> <startIso> <endIso>');
  process.exit(1);
}

const { data, error } = await supabase
  .from('writing_responses')
  .select('*')
  .eq('user_id', userId)
  .gte('created_at', start)
  .lte('created_at', end);

if (error) {
  throw new Error(error.message);
}

const outputPath = join(process.cwd(), `backup-${userId}.json`);
writeFileSync(outputPath, JSON.stringify(data ?? [], null, 2));
console.log(`Exported ${data?.length ?? 0} rows to ${outputPath}`);
