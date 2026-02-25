import type { GeneratePlanInput } from '../studyPlanGenerator';

export function generatePlanPrompt(input: GeneratePlanInput): string {
  const { targetBand, examDate, baselineScores, learningStyle } = input;

  const weeksUntilExam = examDate
    ? Math.max(1, Math.round((new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7)))
    : 12; // default 12 weeks if no date

  return `
You are an expert IELTS tutor. Create a detailed, personalized study plan for a student aiming for band ${targetBand}.

Student's current self-assessment:
- Reading: ${baselineScores.reading ?? 'unknown'}
- Writing: ${baselineScores.writing ?? 'unknown'}
- Listening: ${baselineScores.listening ?? 'unknown'}
- Speaking: ${baselineScores.speaking ?? 'unknown'}

Exam date: ${examDate ? new Date(examDate).toDateString() : 'Not set (assume 12 weeks)'}
Preferred learning style: ${learningStyle}

The plan should be structured in weeks (total weeks: approximately ${weeksUntilExam}). For each week, include:
- A focus area (e.g., "Reading: Skimming techniques")
- A list of days (Monday to Sunday) with 2-4 tasks per day.
- Each task should have: title, description, estimated duration (minutes), type (video, quiz, practice, review), and optionally a contentId (if known).
- At the end, provide 2-3 AI recommendations (e.g., "Focus on Task 1 essays") based on the student's weaknesses.

Output the plan in JSON format with the following structure:
{
  "totalWeeks": number,
  "daysPerWeek": number,
  "weeks": [
    {
      "number": number,
      "focus": string,
      "dateRange": string (optional),
      "days": [
        {
          "day": string (e.g., "Monday"),
          "tasks": [
            {
              "id": string (optional, will be generated),
              "title": string,
              "description": string,
              "duration": number,
              "type": "video" | "quiz" | "practice" | "review",
              "icon": string (optional),
              "contentId": string (optional)
            }
          ]
        }
      ]
    }
  ],
  "recommendations": [
    {
      "title": string,
      "description": string,
      "actionLabel": string (optional),
      "iconName": string (optional)
    }
  ]
}

Make the plan realistic, varied, and aligned with the student's learning style. Prioritize their weakest skills.
`;
}