import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

const ROOT = process.cwd();
const targets = [
  'pages/premium/listening/[slug].tsx',
  'pages/premium/reading/[slug].tsx',
  'pages/writing/mock/[mockId]/workspace.tsx',
  'pages/mock/reading/[id].tsx',
  'pages/mock/listening/[id].tsx',
  'pages/reading/[slug].tsx',
  'pages/listening/[slug].tsx',
  'pages/speaking/simulator/index.tsx',
  'pages/speaking/simulator/part1.tsx',
  'pages/speaking/simulator/part2.tsx',
  'pages/speaking/simulator/part3.tsx',
  'pages/speaking/attempts/[attemptId]/result.tsx',
];

const forbidden = [
  '@/components/Header',
  '@/components/Footer',
  '@/components/Layout',
  '@/components/layouts/',
];

for (const rel of targets) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    test.skip(`${rel} not present`);
    continue;
  }

  test(`${rel} should not import chrome`, () => {
    const src = fs.readFileSync(abs, 'utf-8');
    for (const bad of forbidden) {
      assert.strictEqual(
        src.includes(bad),
        false,
        `${rel} should not import ${bad}`
      );
    }
  });
}
