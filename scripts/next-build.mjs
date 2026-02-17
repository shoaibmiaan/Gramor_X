#!/usr/bin/env node
import { spawn } from 'node:child_process';

const env = { ...process.env };
if (!env.NEXT_DISABLE_LOCKFILE_PATCH) {
  env.NEXT_DISABLE_LOCKFILE_PATCH = '1';
}
if (!env.NEXT_IGNORE_INCORRECT_LOCKFILE) {
  env.NEXT_IGNORE_INCORRECT_LOCKFILE = '1';
}

const child = spawn('next', ['build'], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
