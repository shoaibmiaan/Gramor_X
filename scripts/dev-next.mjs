import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const isWindows = process.platform === 'win32';

const env = {
  ...process.env,
  WATCHPACK_POLLING: process.env.WATCHPACK_POLLING || 'true',
  CHOKIDAR_USEPOLLING: process.env.CHOKIDAR_USEPOLLING || '1',
};

const args = ['dev'];

// Windows file watching can emit unstable events in webpack dev mode on some setups.
// Turbopack avoids the crashing Watchpack code path seen in setup-dev-bundler.js.
if (isWindows && !process.env.NEXT_DISABLE_TURBO_DEV) {
  args.push('--turbo');
}

let command = 'next';
let commandArgs = args;

try {
  const nextBin = require.resolve('next/dist/bin/next');
  command = process.execPath;
  commandArgs = [nextBin, ...args];
} catch {
  // Fallback to resolving `next` from PATH when local package metadata is unavailable.
}

const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  env,
});


child.on('error', (error) => {
  console.error(`[dev:next] Failed to start Next.js dev server: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
