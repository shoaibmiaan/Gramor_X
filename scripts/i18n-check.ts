#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { i18nConfig } from '../lib/i18n/config';

const SOURCE_ROOTS = ['components', 'pages', 'layouts', 'lib'];
const LOCALE_ROOTS = ['locales', path.join('public', 'locales')];
const SNAPSHOT_DIR = path.join('__snapshots__', 'i18n');
const SNAPSHOT_FILE = path.join(SNAPSHOT_DIR, 'keys.snap');
const UPDATE_FLAGS = new Set(['--update', '-u']);

const args = new Set(process.argv.slice(2));
const shouldUpdate = [...UPDATE_FLAGS].some((flag) => args.has(flag));
const thisFile = fileURLToPath(import.meta.url);

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(next, acc);
    } else if (/\.(tsx?|mdx?)$/i.test(entry.name)) {
      acc.push(next);
    }
  }
  return acc;
}

function extractKeys(filePath: string): string[] {
  const source = fs.readFileSync(filePath, 'utf8');
  const matches: string[] = [];
  const regex = /\bt\(\s*(["'`])([^"'`]+?)\1\s*(?:,\s*[^)]*)?\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source))) {
    matches.push(match[2]);
  }
  return matches;
}

function flatten(localeJson: any, prefix = ''): Record<string, string> {
  const flat: Record<string, string> = {};
  if (typeof localeJson !== 'object' || localeJson === null) {
    if (prefix) flat[prefix] = String(localeJson);
    return flat;
  }
  for (const [key, value] of Object.entries(localeJson)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flat, flatten(value, nextPrefix));
    } else if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        const arrKey = `${nextPrefix}[${idx}]`;
        if (typeof item === 'object' && item !== null) {
          Object.assign(flat, flatten(item, arrKey));
        } else {
          flat[arrKey] = String(item);
        }
      });
    } else {
      flat[nextPrefix] = String(value);
    }
  }
  return flat;
}

function loadLocale(locale: string): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const root of LOCALE_ROOTS) {
    const localePath = path.join(root, locale);
    if (!fs.existsSync(localePath)) continue;

    for (const entry of fs.readdirSync(localePath, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const filePath = path.join(localePath, entry.name);
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      Object.assign(merged, flatten(raw));
    }
  }
  return merged;
}

function ensureSnapshotDir() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
}

function loadSnapshot(): string[] {
  if (!fs.existsSync(SNAPSHOT_FILE)) {
    return [];
  }
  const raw = fs.readFileSync(SNAPSHOT_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((k) => typeof k === 'string')) {
      return parsed;
    }
    throw new Error('Snapshot content invalid; expected JSON string array.');
  } catch (error) {
    throw new Error(`Failed to parse snapshot at ${SNAPSHOT_FILE}: ${(error as Error).message}`);
  }
}

function saveSnapshot(keys: string[]) {
  ensureSnapshotDir();
  fs.writeFileSync(SNAPSHOT_FILE, `${JSON.stringify(keys, null, 2)}\n`);
}

function compareSnapshots(actual: string[], expected: string[]): string[] {
  const additions = actual.filter((k) => !expected.includes(k));
  const removals = expected.filter((k) => !actual.includes(k));
  const diffs: string[] = [];
  if (additions.length) {
    diffs.push(`Added keys:\n  - ${additions.join('\n  - ')}`);
  }
  if (removals.length) {
    diffs.push(`Removed keys:\n  - ${removals.join('\n  - ')}`);
  }
  return diffs;
}

function main() {
  const files = SOURCE_ROOTS.flatMap((root) => walk(root));
  const keySet = new Set<string>();
  files.forEach((file) => {
    extractKeys(file).forEach((key) => keySet.add(key));
  });

  const keys = Array.from(keySet).sort();

  if (shouldUpdate) {
    saveSnapshot(keys);
    console.log(`Snapshot updated with ${keys.length} translation keys.`);
  } else {
    const expected = loadSnapshot();
    if (!expected.length && keys.length) {
      console.error('No snapshot found. Run with --update to create one.');
      process.exit(1);
    }
    const diffs = compareSnapshots(keys, expected);
    if (diffs.length) {
      console.error('Translation key snapshot mismatch:\n' + diffs.join('\n'));
      console.error(`\nRun \`tsx ${path.relative(process.cwd(), thisFile)} --update\` to refresh.`);
      process.exit(1);
    }
  }

  if (!keys.length) {
    console.warn('No translation keys detected. Skipping locale coverage checks.');
    return;
  }

  const configuredLocales = new Set(i18nConfig?.locales ?? []);
  const localeSet = new Set<string>();
  for (const root of LOCALE_ROOTS) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (entry.isDirectory()) localeSet.add(entry.name);
    }
  }
  const locales = Array.from(localeSet)
    .filter((locale) => (configuredLocales.size ? configuredLocales.has(locale as string) : true))
    .sort();

  if (!locales.length && configuredLocales.size) {
    locales.push(...Array.from(configuredLocales));
  }

  let hasFailure = false;

  for (const locale of locales) {
    const dictionary = loadLocale(locale);
    const missing = keys.filter((key) => !(key in dictionary));
    const coverage = ((keys.length - missing.length) / keys.length) * 100;

    const formattedCoverage = coverage.toFixed(2);
    console.log(`Locale ${locale}: ${formattedCoverage}% coverage (${keys.length - missing.length}/${keys.length})`);
    if (missing.length) {
      console.log(' Missing keys:');
      missing.slice(0, 20).forEach((key) => console.log(`  - ${key}`));
      if (missing.length > 20) {
        console.log(`  …and ${missing.length - 20} more`);
      }
    }
    if (coverage < 98) {
      console.error(`Locale ${locale} coverage ${formattedCoverage}% is below the 98% threshold.`);
      hasFailure = true;
    }
  }

  if (hasFailure) {
    process.exit(1);
  }

  console.log('i18n snapshot check passed.');
}

try {
  main();
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
