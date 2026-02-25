import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

export type EvidenceSuggestion = {
  statement: string;
  sourceTitle: string;
  sourceSlug: string;
  submittedAt: string;
};

export type HedgingSuggestion = {
  phrase: string;
  count: number;
  tip: string;
};

const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'in', 'on', 'for', 'with', 'about']);

function topicKeywords(topic: string): string[] {
  return topic
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !STOPWORDS.has(token));
}

function rankSentences(text: string, keywords: string[]): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  if (keywords.length === 0) return sentences.slice(0, 3);
  const scored = sentences.map((sentence) => {
    const lower = sentence.toLowerCase();
    const hits = keywords.reduce((score, keyword) => (lower.includes(keyword) ? score + 1 : score), 0);
    return { sentence, hits };
  });
  return scored
    .filter(({ hits }) => hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3)
    .map(({ sentence }) => sentence);
}

export async function fetchReadingEvidence(
  supabase: SupabaseClient<Database>,
  userId: string,
  topic: string,
): Promise<EvidenceSuggestion[]> {
  const { data: responses, error } = await supabase
    .from('reading_responses')
    .select('test_slug, submitted_at')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(5);

  if (error || !responses || responses.length === 0) {
    return [];
  }

  const slugs = Array.from(new Set(responses.map((row) => row.test_slug))).filter(Boolean) as string[];
  if (slugs.length === 0) return [];

  const { data: tests } = await supabase
    .from('reading_tests')
    .select('slug, title, summary, passage_text')
    .in('slug', slugs);

  const keywordList = topicKeywords(topic);
  const evidence: EvidenceSuggestion[] = [];

  responses.forEach((response) => {
    const test = tests?.find((row) => row.slug === response.test_slug);
    if (!test) return;
    const text = (test.summary ?? '') || (test.passage_text ?? '');
    if (!text) return;
    const ranked = rankSentences(text, keywordList);
    ranked.forEach((sentence) => {
      if (sentence.length > 12) {
        evidence.push({
          statement: sentence,
          sourceTitle: test.title ?? response.test_slug,
          sourceSlug: response.test_slug,
          submittedAt: response.submitted_at ?? new Date().toISOString(),
        });
      }
    });
  });

  return evidence.slice(0, 6);
}

const HEDGING_FIXES: Record<string, string> = {
  'i think': 'Replace with a decisive verb (e.g., “clearly demonstrates”).',
  'i believe': 'State the point directly to sound authoritative.',
  maybe: 'Offer a precise claim backed by evidence instead of hedging.',
  perhaps: 'Use “likely” or present concrete data from reading evidence.',
  'sort of': 'Remove filler phrases to tighten your sentence.',
  'kind of': 'Swap for a precise adjective or drop entirely.',
  'it seems': 'Explain why it seems so by citing a fact.',
  'in my opinion': 'IELTS scoring rewards objective language; lead with evidence.',
  'i guess': 'Commit to an argument or rewrite with a stronger verb.',
  probably: 'Quantify the claim or cite research instead.',
  possibly: 'Replace with a confident assertion supported by data.',
};

export function buildHedgingSuggestions(transcripts: string[]): HedgingSuggestion[] {
  const counts: Record<string, number> = {};
  transcripts.forEach((text) => {
    const lower = (text ?? '').toLowerCase();
    Object.keys(HEDGING_FIXES).forEach((phrase) => {
      const hits = lower.split(phrase).length - 1;
      if (hits > 0) {
        counts[phrase] = (counts[phrase] ?? 0) + hits;
      }
    });
  });

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([phrase, count]) => ({ phrase, count, tip: HEDGING_FIXES[phrase] }));
}
