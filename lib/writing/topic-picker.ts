// lib/writing/topic-picker.ts
// Utility helpers to score and select writing topics based on loose criteria.

export type TopicDifficulty = 'starter' | 'intermediate' | 'advanced';

export type WritingTopic = Readonly<{
  id: string;
  title: string;
  prompt: string;
  bandTarget: number;
  tags: string[];
  difficulty: TopicDifficulty;
}>;

export type TopicCriteria = Readonly<{
  targetBand?: number;
  preferredTags?: string[];
  difficulty?: TopicDifficulty;
  excludeIds?: string[];
}>;

const difficultyScore: Record<TopicDifficulty, number> = {
  starter: 0,
  intermediate: 1,
  advanced: 2,
};

function normaliseTags(tags: string[] | null | undefined): string[] {
  return (tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean);
}

function bandScore(topicBand: number, targetBand?: number) {
  if (!targetBand) return 0;
  const delta = Math.abs(topicBand - targetBand);
  // Penalise band mismatch (smaller delta => higher score)
  return Math.max(0, 10 - delta * 3);
}

function tagScore(topicTags: string[], preferred: string[] | undefined) {
  if (!preferred || preferred.length === 0) return 0;
  const set = new Set(preferred.map((tag) => tag.toLowerCase()));
  const matches = topicTags.filter((tag) => set.has(tag.toLowerCase()));
  return matches.length * 5;
}

function difficultyMatchScore(topicDifficulty: TopicDifficulty, desired?: TopicDifficulty) {
  if (!desired) return 0;
  const delta = Math.abs(difficultyScore[topicDifficulty] - difficultyScore[desired]);
  return Math.max(0, 6 - delta * 3);
}

export function scoreTopic(topic: WritingTopic, criteria: TopicCriteria = {}): number {
  const tags = normaliseTags(topic.tags);
  let score = 0;
  score += bandScore(topic.bandTarget, criteria.targetBand);
  score += tagScore(tags, criteria.preferredTags);
  score += difficultyMatchScore(topic.difficulty, criteria.difficulty);

  if (criteria.excludeIds?.includes(topic.id)) {
    score -= 25;
  }

  // Reward recency implicitly when scores tie by nudging longer prompts down.
  score -= Math.max(0, (topic.prompt.length - 600) / 200);
  return score;
}

export function pickTopic(topics: WritingTopic[], criteria: TopicCriteria = {}): WritingTopic | null {
  let best: { topic: WritingTopic; score: number } | null = null;
  for (const topic of topics) {
    const score = scoreTopic(topic, criteria);
    if (!best || score > best.score || (score === best.score && topic.bandTarget > best.topic.bandTarget)) {
      best = { topic, score };
    }
  }
  return best?.topic ?? null;
}

export function suggestTopic(topics: WritingTopic[], criteria: TopicCriteria = {}): WritingTopic | null {
  if (topics.length === 0) return null;
  const filtered = topics.filter((topic) => !criteria.excludeIds?.includes(topic.id));
  if (filtered.length === 0) return null;
  return pickTopic(filtered, criteria) ?? filtered[0];
}

export const topicPicker = { scoreTopic, pickTopic, suggestTopic };

export default topicPicker;
