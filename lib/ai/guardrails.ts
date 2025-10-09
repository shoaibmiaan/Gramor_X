// lib/ai/guardrails.ts

export type CoachMessageRole = 'user' | 'assistant';

export type CoachMessage = {
  role: CoachMessageRole;
  content: string;
};

export type GuardrailResult = { ok: true } | { ok: false; reason: string };

const MAX_MESSAGES = 8;
const MAX_LENGTH = 1500;
const BLOCK_PATTERNS: RegExp[] = [
  /ignore\s+all\s+previous\s+instructions/i,
  /ignore\s+the\s+previous/i,
  /forget\s+(?:all|my)\s+instructions/i,
  /disregard\s+(?:this|earlier)\s+context/i,
  /system\s+prompt/i,
  /developer\s+mode/i,
  /jailbreak/i,
  /act\s+as\s+a\s+system/i,
  /bypass\s+.*guard/i,
  /rewrite\s+your\s+rules/i,
];

export function sanitizeCoachMessages(input: unknown): CoachMessage[] {
  if (!Array.isArray(input)) return [];

  const sliced = input.slice(-MAX_MESSAGES);
  const cleaned: CoachMessage[] = [];

  for (const raw of sliced) {
    if (!raw || typeof raw !== 'object') continue;
    const role = (raw as any).role === 'assistant' ? 'assistant' : 'user';
    const content = typeof (raw as any).content === 'string' ? (raw as any).content : '';
    const trimmed = content.replace(/\s+/g, ' ').trim();
    if (!trimmed) continue;
    cleaned.push({
      role,
      content: trimmed.slice(0, MAX_LENGTH),
    });
  }

  return cleaned;
}

export function detectPromptInjection(messages: CoachMessage[]): GuardrailResult {
  for (const message of messages) {
    if (message.role !== 'user') continue;
    for (const pattern of BLOCK_PATTERNS) {
      if (pattern.test(message.content)) {
        return {
          ok: false,
          reason: 'prompt_injection_detected',
        };
      }
    }
  }
  return { ok: true };
}

export function truncateForModel(messages: CoachMessage[]): CoachMessage[] {
  if (messages.length <= MAX_MESSAGES) return messages;
  return messages.slice(-MAX_MESSAGES);
}
