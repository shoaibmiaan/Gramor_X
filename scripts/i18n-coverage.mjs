import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BASE_LOCALE = 'en';
const LOCALES = ['ur'];

const baseDir = path.join(ROOT, 'locales', BASE_LOCALE);
const files = fs.readdirSync(baseDir).filter((file) => file.endsWith('.json'));

const flatten = (messages, prefix = '') =>
  Object.entries(messages).reduce((acc, [key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flatten(value, nextKey));
    } else {
      acc[nextKey] = value;
    }
    return acc;
  }, {});

let exitCode = 0;

for (const locale of LOCALES) {
  const localeDir = path.join(ROOT, 'locales', locale);
  const missing = [];

  for (const file of files) {
    const baseMessages = flatten(JSON.parse(fs.readFileSync(path.join(baseDir, file), 'utf8')));
    const localeFile = path.join(localeDir, file);

    if (!fs.existsSync(localeFile)) {
      missing.push(`${file} (missing file)`);
      continue;
    }

    const localeMessages = flatten(JSON.parse(fs.readFileSync(localeFile, 'utf8')));

    for (const key of Object.keys(baseMessages)) {
      if (!(key in localeMessages)) {
        missing.push(`${file}:${key}`);
      }
    }
  }

  if (missing.length > 0) {
    exitCode = 1;
    console.error(`\nMissing translations for locale "${locale}":`);
    for (const item of missing) console.error(`  - ${item}`);
  } else {
    console.log(`Locale "${locale}" covers all keys.`);
  }
}

if (exitCode === 0) {
  console.log('All locales are complete.');
}

process.exit(exitCode);
