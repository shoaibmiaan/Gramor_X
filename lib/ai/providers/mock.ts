import type { AIProvider } from './types';

export class MockProvider implements AIProvider {
  async generateChatCompletion(messages: { role: string; content: string }[]): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return JSON.stringify({
      totalWeeks: 8,
      daysPerWeek: 5,
      weeks: [
        {
          number: 1,
          focus: 'Reading: Skimming and Scanning',
          days: [
            {
              day: 'Monday',
              tasks: [
                {
                  id: 'task1',
                  title: 'Reading Practice Test 1',
                  description: 'Complete a full reading passage with questions',
                  duration: 30,
                  type: 'practice',
                },
              ],
            },
          ],
        },
      ],
      recommendations: [
        {
          title: 'Focus on Vocabulary',
          description: 'Your reading comprehension would benefit from targeted vocabulary practice.',
        },
      ],
    });
  }
}