// lib/ai.ts
import OpenAI from "openai";

type Provider = "groq" | "openai" | "grok" | "deepseek";

const provider = (process.env.GX_AI_PROVIDER || "groq").toLowerCase() as Provider;

/**
 * Endpoints + key selection per provider.
 * GROQ is OpenAI-compatible at https://api.groq.com/openai/v1
 * xAI (Grok) is at https://api.x.ai/v1
 * DeepSeek is at https://api.deepseek.com
 */
const configByProvider = {
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY!,
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  },
  openai: {
    baseURL: process.env.OPENAI_API_BASE || "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  },
  grok: {
    baseURL: "https://api.x.ai/v1",
    apiKey: process.env.GROK_API_KEY!,
    model: process.env.GROK_MODEL || "grok-2-latest",
  },
  deepseek: {
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY!,
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  },
} as const;

const cfg = configByProvider[provider];

if (!cfg.apiKey) {
  console.warn(`[AI] Missing API key for provider=${provider}. Check your env.`);
}

export const AI_PROVIDER = provider;
export const AI_MODEL = cfg.model;

export const ai = new OpenAI({
  apiKey: cfg.apiKey,
  baseURL: cfg.baseURL,
});
