import { spawn } from 'node:child_process';

const env = {
  ...process.env,
  WATCHPACK_POLLING: process.env.WATCHPACK_POLLING || 'true',
};

const child = spawn('next', ['dev'], {
  stdio: 'inherit',
  shell: true,
  env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
