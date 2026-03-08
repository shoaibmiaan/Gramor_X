#!/usr/bin/env ts-node
/**
 * Backfill and validate canonical profile key contract:
 *   profiles.id = auth.users.id
 *
 * Usage:
 *   ts-node scripts/backfill_profiles_primary_id.ts           # dry-run
 *   ts-node scripts/backfill_profiles_primary_id.ts --apply   # write fixes
 */

// @ts-expect-error Add supabase-js to deps when ready
import { createClient } from '@supabase/supabase-js';

type ProfileRow = {
  id: string | null;
  user_id: string | null;
};

const PAGE_SIZE = 1000;

async function listProfiles(supabase: any): Promise<ProfileRow[]> {
  const rows: ProfileRow[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('profiles')
      .select('id,user_id')
      .range(from, to);

    if (error) throw error;

    const batch = (data ?? []) as ProfileRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchAuthUserIds(supabase: any, ids: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  const chunkSize = 500;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await supabase.schema('auth').from('users').select('id').in('id', chunk);
    if (error) throw error;
    for (const row of data ?? []) {
      if (row?.id) found.add(row.id as string);
    }
  }

  return found;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const profiles = await listProfiles(supabase);

  const missingId = profiles.filter((p) => !p.id && !!p.user_id);
  const invalidRows = profiles.filter((p) => !p.id && !p.user_id);
  const candidateIds = Array.from(new Set(profiles.map((p) => p.id ?? p.user_id).filter(Boolean) as string[]));
  const authIds = await fetchAuthUserIds(supabase, candidateIds);

  const orphanProfiles = profiles.filter((p) => {
    const canonical = p.id ?? p.user_id;
    return !canonical || !authIds.has(canonical);
  });

  console.log(`profiles total: ${profiles.length}`);
  console.log(`profiles missing id (with user_id available): ${missingId.length}`);
  console.log(`profiles with neither id nor user_id: ${invalidRows.length}`);
  console.log(`orphan profiles (no matching auth.users row): ${orphanProfiles.length}`);

  if (!apply) {
    console.log('Dry run complete. Re-run with --apply to backfill missing profiles.id values.');
    return;
  }

  let updated = 0;
  for (const row of missingId) {
    const { error } = await supabase
      .from('profiles')
      .update({ id: row.user_id })
      .eq('user_id', row.user_id)
      .is('id', null);

    if (error) {
      console.error('Failed to backfill profile id for user_id=', row.user_id, error.message);
      continue;
    }

    updated += 1;
  }

  console.log(`Applied profile id backfills: ${updated}`);
  if (orphanProfiles.length > 0) {
    console.warn('Orphan profile rows detected. Resolve these manually before removing legacy user_id fallback.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
