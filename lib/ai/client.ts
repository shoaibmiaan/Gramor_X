import { OpenAIProvider } from './providers/openai';
import { GroqProvider } from './providers/groq';
import { GeminiProvider } from './providers/gemini';
import { DeepSeekProvider } from './providers/deepseek';
import { PublicAIProvider } from './providers/publicai';
import { MockProvider } from './providers/mock';
import type { AIProvider } from './providers/types';

export type ProviderType = 'openai' | 'groq' | 'gemini' | 'deepseek' | 'publicai' | 'mock';

type ProviderAvailability = {
  openai: boolean;
  groq: boolean;
  gemini: boolean;
  deepseek: boolean;
  publicai: boolean;
};

const PROVIDER_PRIORITY: ProviderType[] = ['publicai', 'groq', 'gemini', 'deepseek', 'openai', 'mock'];

function hasKey(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getProviderAvailability(): ProviderAvailability {
  return {
    openai: hasKey(process.env.OPENAI_API_KEY),
    groq: hasKey(process.env.GROQ_API_KEY),
    gemini: hasKey(process.env.GEMINI_API_KEY),
    deepseek: hasKey(process.env.DEEPSEEK_API_KEY),
    publicai: hasKey(process.env.PUBLICAI_API_KEY),
  };
}

function sanitizeProviderName(value: string | undefined): ProviderType | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  if (lower === 'openai' || lower === 'groq' || lower === 'gemini' || lower === 'deepseek' || lower === 'publicai' || lower === 'mock') {
    return lower;
  }
  return null;
}

export function resolveProviderType(): ProviderType {
  const availability = getProviderAvailability();
  const explicit = sanitizeProviderName(process.env.AI_PROVIDER) ?? sanitizeProviderName(process.env.GX_AI_PROVIDER);

  if (explicit && explicit !== 'mock') {
    if (availability[explicit]) {
      return explicit;
    }
    console.warn(`[ai/client] ${explicit} selected but key is missing; falling back to best available provider.`);
  }

  if (explicit === 'mock') {
    return 'mock';
  }

  const bestAvailable = PROVIDER_PRIORITY.find((provider) => provider === 'mock' || availability[provider]);
  return bestAvailable ?? 'mock';
}

function getProvider(): AIProvider {
  const provider = resolveProviderType();

  const openaiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const publicaiKey = process.env.PUBLICAI_API_KEY;

  switch (provider) {
    case 'openai':
      return new OpenAIProvider(openaiKey as string, process.env.OPENAI_MODEL || 'gpt-3.5-turbo');

    case 'groq':
      return new GroqProvider(groqKey as string, process.env.GROQ_MODEL || 'llama-3.3-70b-versatile');

    case 'gemini':
      return new GeminiProvider(geminiKey as string, process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest');

    case 'deepseek':
      return new DeepSeekProvider(deepseekKey as string, process.env.DEEPSEEK_MODEL || 'deepseek-chat');

    case 'publicai':
      return new PublicAIProvider(publicaiKey as string, process.env.PUBLICAI_MODEL || 'Apertus-70B');

    case 'mock':
    default:
      return new MockProvider();
  }
}

export const activeAIProvider = resolveProviderType();
export const aiClient = getProvider();
export const isAIAvailable = activeAIProvider !== 'mock';
