import { ensureUsageAllowed, incrementUsage, type UsageKey } from '@/lib/usage';

export type WritingGradePayload = { task1: string; task2: string };
export type SpeakingGradePayload = { attemptId: string };
export type TutorAskPayload = {
  module: 'listening' | 'reading' | 'writing' | 'speaking';
  prompt: string;
};

export type AICoachRequest = {
  userId?: string | null;
  context?: string;
  goal?: string;
};

export type Drill = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

const DEFAULT_LIMITS: Record<UsageKey, number> = {
  'ai.writing.grade': 3,
  'ai.speaking.grade': 3,
  'ai.explain': 5,
  'mock.start': 1,
  'mock.submit': 1,
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error((await res.text()) || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function gradeWriting(payload: WritingGradePayload) {
  await ensureUsageAllowed('ai.writing.grade', DEFAULT_LIMITS['ai.writing.grade']);
  const result = await postJson('/api/ai/writing/grade', payload);
  await incrementUsage('ai.writing.grade');
  return result;
}

export async function gradeSpeaking(payload: SpeakingGradePayload) {
  await ensureUsageAllowed('ai.speaking.grade', DEFAULT_LIMITS['ai.speaking.grade']);
  const result = await postJson('/api/ai/speaking/grade', payload);
  await incrementUsage('ai.speaking.grade');
  return result;
}

export async function askTutor(
  payload: TutorAskPayload,
): Promise<{ ok: boolean; reply?: string; error?: string }> {
  return postJson('/api/ai/tutor/ask', payload);
}

export async function runCoach<T>(payload: AICoachRequest): Promise<T> {
  return postJson<T>('/api/ai/coach', payload);
}

export async function trackCoachAction(payload: { suggestionId: string; userId?: string | null }) {
  return postJson('/api/ai/coach/action', payload);
}

export async function uploadAudio(blob: Blob): Promise<{ ok: boolean; url?: string }> {
  const form = new FormData();
  form.append('file', blob, `speaking-${Date.now()}.webm`);
  const res = await fetch('/api/content/upload', { method: 'POST', body: form });
  if (!res.ok) return { ok: false };
  return (await res.json()) as { ok: boolean; url?: string };
}

export async function generateDrill(): Promise<Drill | null> {
  await ensureUsageAllowed('ai.explain', DEFAULT_LIMITS['ai.explain']);
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content:
            'Return a JSON object with keys question, options (array), answer (index), explanation. Create a short English grammar multiple-choice drill.',
        },
        { role: 'user', content: 'Create a drill.' },
      ],
    }),
  });
  if (!res.body) return null;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n\n')) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) text += delta;
      } catch {
        // no-op
      }
    }
  }

  await incrementUsage('ai.explain');
  return JSON.parse(text) as Drill;
}
