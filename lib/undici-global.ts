// lib/undici-global.ts   <-- Create this file
import { setGlobalDispatcher, Agent } from 'undici';

setGlobalDispatcher(
  new Agent({
    connect: {
      timeout: 30000,   // 30 seconds for connect phase (increase to 60000 if needed)
    },
    // Optional extras for stability
    keepAliveTimeout: 10000,
    keepAliveMaxTimeout: 30000,
  })
);

console.log('[undici] Global connect timeout set to 30s');