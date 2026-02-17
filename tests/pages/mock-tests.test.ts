import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const content = readFileSync(join(__dirname, '..', '..', 'pages', 'mock', 'index.tsx'), 'utf8');

assert.match(content, /Mock Tests/);
assert.match(content, /Full-length exams and section-wise practice with AI scoring/);

console.log('mock tests page content verified');
