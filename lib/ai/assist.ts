// lib/ai/assist.ts
import { env } from '@/lib/env';

export type ParaphraseSuggestion = Readonly<{
  rewrite: string;
  why: string;
  focus: 'lexical' | 'collocation';
}>;

export type ParaphraseCoachResponse =
  | { ok: true; source: 'ai' | 'heuristic'; suggestions: ParaphraseSuggestion[] }
  | { ok: false; error: string; code?: string };

export type SpeakingHintResponse =
  | { ok: true; source: 'ai' | 'heuristic'; sentences: string[]; tip?: string }
  | { ok: false; error: string; code?: string };

const base = typeof window === 'undefined' ? env.SITE_URL || env.NEXT_PUBLIC_BASE_URL || '' : '';

async function authHeader(): Promise<Record<string, string>> {
  try {
    const { supabaseBrowser } = await import('@/lib/supabaseBrowser');
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function requestParaphraseCoach(body: { sentence: string; context?: string }): Promise<ParaphraseCoachResponse> {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(await authHeader()),
    };
    const res = await fetch(`${base}/api/ai/writing/paraphrase`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return (await res.json()) as ParaphraseCoachResponse;
  } catch (error: any) {
    return { ok: false, error: error?.message ?? 'network_error' };
  }
}

export async function requestSpeakingHints(body: { keyword: string; cue?: string }): Promise<SpeakingHintResponse> {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(await authHeader()),
    };
    const res = await fetch(`${base}/api/ai/speaking/hints`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return (await res.json()) as SpeakingHintResponse;
  } catch (error: any) {
    return { ok: false, error: error?.message ?? 'network_error' };
  }
}
