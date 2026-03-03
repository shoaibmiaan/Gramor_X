import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const INCLUDE_DIRS = ['components', 'pages', 'layouts'];
const EXT = new Set(['.tsx', '.jsx']);

const CATEGORIES = [
  ['Button', /button/i],
  ['Card', /card/i],
  ['Input', /input/i],
  ['Modal', /modal|dialog/i],
  ['Table', /table/i],
  ['Badge', /badge/i],
  ['Alert', /alert|toast/i],
  ['Tabs', /tab/i],
  ['Dropdown', /dropdown|menu/i],
  ['Layout', /layout/i],
  ['Navigation', /nav|navigation/i],
  ['Skeleton', /skeleton|shimmer/i],
  ['EmptyState', /empty.?state/i],
];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (EXT.has(path.extname(entry.name))) acc.push(p);
  }
  return acc;
}

const files = INCLUDE_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
const out = {};
for (const [name] of CATEGORIES) out[name] = [];
out.Other = [];

for (const file of files) {
  const rel = path.relative(ROOT, file).replaceAll('\\', '/');
  const base = path.basename(file);
  const match = CATEGORIES.find(([, re]) => re.test(base));
  if (match) out[match[0]].push(rel);
  else out.Other.push(rel);
}

const summary = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length]));
const payload = { generatedAt: new Date().toISOString(), totalFiles: files.length, summary, components: out };

fs.mkdirSync(path.join(ROOT, 'docs/baseline'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/baseline/ui-component-inventory.json'), JSON.stringify(payload, null, 2));

console.log('Wrote docs/baseline/ui-component-inventory.json');
console.log(summary);
