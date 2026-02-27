import { OpenAIProvider } from './providers/openai';
import { GroqProvider } from './providers/groq';
import { GeminiProvider } from './providers/gemini';
import { DeepSeekProvider } from './providers/deepseek';
import { PublicAIProvider } from './providers/publicai';
import { MockProvider } from './providers/mock';
import type { AIProvider } from './providers/types';

export type ProviderType = 'openai' | 'groq' | 'gemini' | 'deepseek' | 'publicai' | 'mock';

function getProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER || 'mock') as ProviderType;

  const openaiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const publicaiKey = process.env.PUBLICAI_API_KEY;

  switch (provider) {
    case 'openai':
      if (!openaiKey) {
        console.warn('OPENAI_API_KEY not set, falling back to mock');
        return new MockProvider();
      }
      return new OpenAIProvider(openaiKey, process.env.OPENAI_MODEL || 'gpt-3.5-turbo');

    case 'groq':
      if (!groqKey) {
        console.warn('GROQ_API_KEY not set, falling back to mock');
        return new MockProvider();
      }
      return new GroqProvider(groqKey, process.env.GROQ_MODEL || 'llama-3.3-70b-versatile');

    case 'gemini':
      if (!geminiKey) {
        console.warn('GEMINI_API_KEY not set, falling back to mock');
        return new MockProvider();
      }
      return new GeminiProvider(geminiKey, process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest');

    case 'deepseek':
      if (!deepseekKey) {
        console.warn('DEEPSEEK_API_KEY not set, falling back to mock');
        return new MockProvider();
      }
      return new DeepSeekProvider(deepseekKey, process.env.DEEPSEEK_MODEL || 'deepseek-chat');

    case 'publicai':
      if (!publicaiKey) {
        console.warn('PUBLICAI_API_KEY not set, falling back to mock');
        return new MockProvider();
      }
      return new PublicAIProvider(
        publicaiKey,
        process.env.PUBLICAI_MODEL || 'Apertus-70B'
      );

    case 'mock':
    default:
      return new MockProvider();
  }
}

export const aiClient = getProvider();

export const isAIAvailable = process.env.AI_PROVIDER !== 'mock' && !!(
  process.env.OPENAI_API_KEY ||
  process.env.GROQ_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.DEEPSEEK_API_KEY ||
  process.env.PUBLICAI_API_KEY
);