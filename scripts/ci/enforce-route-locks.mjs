#!/usr/bin/env node
import { execSync } from 'node:child_process';

const lockedFiles = [
  'pages/leaderboard/index.tsx',
  'pages/account/activity.tsx',
  'pages/account/billing-history.tsx',
  'pages/settings/security.tsx',
  'pages/dashboard/activity/index.tsx',
];

if (process.env.ROUTE_LOCK_OVERRIDE === '1' || process.env.ROUTE_LOCK_OVERRIDE === 'true') {
  console.log('Route lock override detected (ROUTE_LOCK_OVERRIDE). Skipping enforcement.');
  process.exit(0);
}

const baseRef = process.env.ROUTE_LOCK_BASE_REF || process.env.SYSTEM_PULLREQUEST_TARGETBRANCH || 'origin/main';
let changed = '';

try {
  changed = execSync(`git diff --name-only ${baseRef}...HEAD 2>/dev/null`, { encoding: 'utf8', shell: '/bin/bash' }).trim();
} catch {
  changed = execSync('git diff --name-only HEAD~1..HEAD', { encoding: 'utf8' }).trim();
}

const changedSet = new Set(changed.split('\n').filter(Boolean));
const touchedLocked = lockedFiles.filter((file) => changedSet.has(file));

if (touchedLocked.length > 0) {
  console.error('Locked done routes were modified without explicit override.');
  console.error('Set ROUTE_LOCK_OVERRIDE=true in CI only after codeowner approval.');
  for (const file of touchedLocked) {
    console.error(` - ${file}`);
  }
  process.exit(1);
}

console.log('Route lock check passed.');
