import type { StudyPlan, Week, DayTask } from '@/types/study-plan';
import { generatePlanPrompt } from './prompts/studyPlan';
import { openai } from '@/lib/ai/client'; // hypothetical AI client

interface GeneratePlanInput {
  targetBand: number;
  examDate: string | null;
  baselineScores: {
    reading: number | null;
    writing: number | null;
    listening: number | null;
    speaking: number | null;
  };
  learningStyle: 'video' | 'tips' | 'practice' | 'flashcards';
}

export async function generatePlanFromAI(
  input: GeneratePlanInput
): Promise<StudyPlan> {
  // 1. Prepare prompt
  const prompt = generatePlanPrompt(input);

  // 2. Call AI (OpenAI example)
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are an expert IELTS tutor. Generate a detailed study plan in JSON format.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error('Empty AI response');

  // 3. Parse and validate the response
  const planData = JSON.parse(content);

  // 4. Transform into our StudyPlan type
  const plan: StudyPlan = {
    targetBand: input.targetBand,
    examDate: input.examDate,
    baselineScores: input.baselineScores,
    learningStyle: input.learningStyle,
    totalWeeks: planData.totalWeeks,
    daysPerWeek: planData.daysPerWeek,
    weeks: planData.weeks.map((w: any) => ({
      id: w.id || `week-${w.number}`,
      number: w.number,
      focus: w.focus,
      dateRange: w.dateRange,
      isCurrent: w.number === 1,
      days: w.days?.map((d: any) => ({
        day: d.day,
        tasks: d.tasks.map((t: any) => ({
          id: t.id || `task-${Date.now()}-${Math.random()}`,
          title: t.title,
          description: t.description,
          duration: t.duration,
          completed: false,
          icon: t.icon || getIconForTaskType(t.type),
          type: t.type,
          contentId: t.contentId,
        })),
      })),
    })),
    firstTaskId: planData.weeks?.[0]?.days?.[0]?.tasks?.[0]?.id,
    recommendations: planData.recommendations?.map((r: any) => ({
      title: r.title,
      description: r.description,
      actionLabel: r.actionLabel,
      iconName: r.iconName,
    })),
    generatedAt: new Date().toISOString(),
  };

  // Add helper method
  plan.getTodayTasks = function () {
    // For simplicity, assume first week, first day
    return this.weeks?.[0]?.days?.[0]?.tasks ?? [];
  };

  return plan;
}

function getIconForTaskType(type?: string): string {
  switch (type) {
    case 'video':
      return 'video';
    case 'quiz':
      return 'help-circle';
    case 'practice':
      return 'edit-3';
    case 'review':
      return 'refresh-cw';
    default:
      return 'file';
  }
}