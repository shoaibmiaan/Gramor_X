import { beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

describe('resolveProviderType', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.AI_PROVIDER;
    delete process.env.GX_AI_PROVIDER;
    delete process.env.PUBLICAI_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it('uses explicitly selected provider when its key exists', async () => {
    process.env.AI_PROVIDER = 'publicai';
    process.env.PUBLICAI_API_KEY = 'pk_test';

    const mod = await import('@/lib/ai/client');
    expect(mod.resolveProviderType()).toBe('publicai');
  });

  it('falls back to best available provider when explicit key is missing', async () => {
    process.env.AI_PROVIDER = 'publicai';
    process.env.GROQ_API_KEY = 'gsk_test';

    const mod = await import('@/lib/ai/client');
    expect(mod.resolveProviderType()).toBe('groq');
  });

  it('uses GX_AI_PROVIDER as a compatibility fallback', async () => {
    process.env.GX_AI_PROVIDER = 'deepseek';
    process.env.DEEPSEEK_API_KEY = 'sk_test';

    const mod = await import('@/lib/ai/client');
    expect(mod.resolveProviderType()).toBe('deepseek');
  });
});
