import { defineConfig } from '@playwright/test';
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo';
export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: BASE,
    headless: true,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    },
  },
  webServer: process.env.BASE_URL ? undefined : {
    command: `NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL} NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY} npm run start`,
    url: 'http://localhost:3000',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
