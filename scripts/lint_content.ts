#!/usr/bin/env tsx
// scripts/lint_content.ts
// Quick lint that validates word drill packs for duplicates, profanity, and IELTS tagging.

import process from 'node:process';

import { loadWordPacks } from '@/lib/content/word-packs';
import { summarizeValidation } from '@/lib/content/validate';

async function main() {
  const packs = loadWordPacks();
  const { issues, total } = summarizeValidation(packs);

  if (issues.length) {
    console.error(`❌ Content lint failed for ${total} word packs:`);
    for (const issue of issues) {
      console.error(`  - ${issue}`);
    }
    process.exit(1);
  }

  console.log(`✅ Content lint passed for ${total} word packs.`);
}

void main();
