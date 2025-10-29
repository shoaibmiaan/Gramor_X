/* eslint-disable no-console */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types/supabase';

type PromptSeed = {
  slug: string;
  part: 'p1' | 'p2' | 'p3' | 'interview' | 'scenario';
  topic: string;
  question?: string | null;
  cueCard?: string | null;
  followups?: string[];
  difficulty: 'B1' | 'B2' | 'C1' | 'C2';
  locale?: string;
  tags?: string[];
  isActive?: boolean;
};

type PackSeed = {
  slug: string;
  title: string;
  description?: string;
  visibility?: 'public' | 'cohort' | 'private';
  prompts: string[];
};

type Tables = Database['speaking_prompts'];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey, { auth: { persistSession: false } });

function chunk<T>(items: T[], size = 100): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function loadJson<T>(file: string): T {
  const filePath = path.resolve(__dirname, '..', 'data', 'speaking', file);
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

async function upsertPrompts(prompts: PromptSeed[]) {
  for (const batch of chunk(prompts, 200)) {
    const payload = batch.map((prompt) => ({
      slug: prompt.slug,
      part: prompt.part,
      topic: prompt.topic,
      question: prompt.question ?? null,
      cue_card: prompt.cueCard ?? null,
      followups: prompt.followups ?? [],
      difficulty: prompt.difficulty,
      locale: prompt.locale ?? 'en',
      tags: prompt.tags ?? [],
      is_active: prompt.isActive ?? true,
    } satisfies Partial<Tables>));

    const { error } = await supabase
      .from('speaking_prompts')
      .upsert(payload, { onConflict: 'slug' });

    if (error) {
      throw new Error(`Failed to upsert prompts: ${error.message}`);
    }
  }

  const { data, error } = await supabase
    .from('speaking_prompts')
    .select('id, slug')
    .in('slug', prompts.map((p) => p.slug));

  if (error) {
    throw new Error(`Failed to fetch prompt IDs: ${error.message}`);
  }

  const ids = new Map<string, string>();
  (data ?? []).forEach((row) => ids.set(row.slug, row.id));
  return ids;
}

async function upsertPacks(packs: PackSeed[], promptIds: Map<string, string>) {
  if (packs.length === 0) return;

  const { data, error } = await supabase
    .from('speaking_prompt_packs')
    .upsert(
      packs.map((pack) => ({
        slug: pack.slug,
        title: pack.title,
        description: pack.description ?? null,
        visibility: pack.visibility ?? 'public',
        is_active: true,
      })),
      { onConflict: 'slug' },
    )
    .select('id, slug');

  if (error) {
    throw new Error(`Failed to upsert packs: ${error.message}`);
  }

  const inserted = new Map<string, string>();
  (data ?? []).forEach((row) => inserted.set(row.slug, row.id));

  for (const pack of packs) {
    const packId = inserted.get(pack.slug);
    if (!packId) continue;

    const promptIdList = pack.prompts
      .map((slug) => promptIds.get(slug))
      .filter((id): id is string => Boolean(id));

    await supabase.from('speaking_prompt_pack_items').delete().eq('pack_id', packId);

    if (promptIdList.length === 0) continue;

    const items = promptIdList.map((promptId, index) => ({
      pack_id: packId,
      prompt_id: promptId,
      sort_order: index,
    }));

    for (const batch of chunk(items, 200)) {
      const { error: itemError } = await supabase
        .from('speaking_prompt_pack_items')
        .upsert(batch, { onConflict: 'pack_id,prompt_id' });

      if (itemError) {
        throw new Error(`Failed to upsert pack items for ${pack.slug}: ${itemError.message}`);
      }
    }
  }
}

async function main() {
  const prompts = loadJson<PromptSeed[]>('prompts_seed.json');
  const packs = loadJson<PackSeed[]>('packs_seed.json');

  console.log(`Seeding ${prompts.length} prompts…`);
  const promptIds = await upsertPrompts(prompts);

  console.log(`Seeding ${packs.length} packs…`);
  await upsertPacks(packs, promptIds);

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
