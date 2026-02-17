// lib/ai/writing/insightsAdapter.ts
import { z } from 'zod';

export const CriterionEnum = z.enum(['task_response', 'coherence', 'lexical', 'grammar']);
export type Criterion = z.infer<typeof CriterionEnum>;

export const RecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  focus: CriterionEnum,
});

export const SuggestedTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  minutes: z.number().int().positive(),
  focus: CriterionEnum,
  prompt: z.string(),
});

export const InsightsSchema = z.object({
  weakestCriterion: CriterionEnum.nullable(),
  recommendations: z.array(RecommendationSchema),
  tasks: z.array(SuggestedTaskSchema),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;
export type SuggestedTask = z.infer<typeof SuggestedTaskSchema>;
export type Insights = z.infer<typeof InsightsSchema>;

type GetInsightsOptions = {
  // future: date windows, attempt limit, provider, etc.
};

export async function getInsights(userId: string, _opts?: GetInsightsOptions): Promise<Insights> {
  // Stub: return empty scaffold; wire real scorer later.
  return {
    weakestCriterion: null,
    recommendations: [],
    tasks: [],
  };
}
