import { aiClient, isAIAvailable } from './client';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function generatePlanFromAI(profile: any) {
  console.log('Generating study plan with AI provider...');

  const prompt = `Create a detailed IELTS study plan for a student with the following profile:

Target Band Score: ${profile.target_band}
Exam Date: ${profile.exam_date}
Current Scores:
- Reading: ${profile.baseline_scores?.reading || 'Not provided'}
- Writing: ${profile.baseline_scores?.writing || 'Not provided'}
- Speaking: ${profile.baseline_scores?.speaking || 'Not provided'}
- Listening: ${profile.baseline_scores?.listening || 'Not provided'}
Learning Style: ${profile.learning_style || 'Not specified'}
Weekly Study Hours: ${profile.weekly_availability || 10}

Please generate a comprehensive JSON study plan with the following structure:
{
  "weeks": [
    {
      "weekNumber": 1,
      "focus": "Main focus for the week",
      "skills": ["reading", "writing", "listening", "speaking"],
      "days": [
        {
          "day": 1,
          "tasks": [
            {
              "title": "Task title",
              "description": "Task description",
              "type": "reading|writing|listening|speaking|vocabulary",
              "duration": 45,
              "resources": ["Resource links or references"]
            }
          ]
        }
      ],
      "milestones": ["Weekly milestones"],
      "practiceTest": false
    }
  ],
  "totalWeeks": 8,
  "skillGaps": {
    "reading": ${8 - (profile.baseline_scores?.reading || 6)},
    "writing": ${8.5 - (profile.baseline_scores?.writing || 6)},
    "listening": ${8 - (profile.baseline_scores?.listening || 6.5)},
    "speaking": ${8 - (profile.baseline_scores?.speaking || 6.5)}
  },
  "recommendations": ["General recommendations"],
  "mockTestSchedule": [
    {
      "week": 4,
      "type": "full",
      "skills": ["all"]
    }
  ]
}

Make it personalized based on their learning style: ${profile.learning_style}`;

  try {
    // Check if AI is available, otherwise use mock data
    if (!isAIAvailable) {
      console.log('AI not available, using mock study plan');
      return generateMockStudyPlan(profile);
    }

    const response = await aiClient.chat?.(prompt) || await aiClient.complete?.(prompt);

    if (!response) {
      console.warn('AI provider returned no response, using mock');
      return generateMockStudyPlan(profile);
    }

    // Try to parse JSON from the response
    try {
      // Extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) ||
                       response.match(/```\n([\s\S]*?)\n```/) ||
                       response.match(/{[\s\S]*}/);

      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;
      const parsedData = JSON.parse(jsonStr);
      return parsedData;
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Raw response:', response);
      return generateMockStudyPlan(profile);
    }
  } catch (error) {
    console.error('Error calling AI provider:', error);
    return generateMockStudyPlan(profile);
  }
}

export async function generateStudyPlan(userId: string, profile: any) {
  console.log('generateStudyPlan started for user:', userId);
  console.log('Profile data:', profile);

  try {
    // Check if plan already exists
    const { data: existingPlan } = await supabaseAdmin
      .from('study_plans')
      .select('id, plan_data')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingPlan) {
      console.log('Study plan already exists for user:', userId);

      // Update profile to mark onboarding as complete if not already
      await supabaseAdmin
        .from('profiles')
        .update({
          onboarding_step: 6,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      return existingPlan;
    }

    console.log('Calling generatePlanFromAI...');
    const planData = await generatePlanFromAI(profile);

    // Ensure planData has the required structure
    const enrichedPlanData = {
      ...planData,
      target_band: profile.target_band,
      exam_date: profile.exam_date,
      current_scores: profile.baseline_scores,
      learning_style: profile.learning_style,
      generated_at: new Date().toISOString()
    };

    // Store the plan in database
    const { data: newPlan, error } = await supabaseAdmin
      .from('study_plans')
      .insert({
        user_id: userId,
        target_band: profile.target_band,
        exam_date: profile.exam_date,
        plan_data: enrichedPlanData,
        weeks: enrichedPlanData.weeks || [],
        progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting study plan:', error);
      throw error;
    }

    // Update profile to mark onboarding as complete
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        onboarding_step: 6,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
    }

    // Generate initial tasks
    await generateInitialTasks(userId, enrichedPlanData);

    // Log success
    await supabaseAdmin
      .from('generation_logs')
      .insert({
        user_id: userId,
        type: 'study_plan',
        status: 'completed',
        created_at: new Date().toISOString()
      });

    console.log('Study plan generated successfully for user:', userId);
    return newPlan;

  } catch (error) {
    console.error('Error in generateStudyPlan:', error);

    // Log the error
    await supabaseAdmin
      .from('generation_logs')
      .insert({
        user_id: userId,
        type: 'study_plan',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        created_at: new Date().toISOString()
      });

    // Don't throw - we want to return a mock plan instead of failing
    console.log('Falling back to mock study plan due to error');
    return generateMockStudyPlan(profile);
  }
}

async function generateInitialTasks(userId: string, planData: any) {
  const tasks = [];

  // Generate tasks for first week
  if (planData.weeks && planData.weeks[0] && planData.weeks[0].days) {
    const week = planData.weeks[0];

    // Calculate dates for the next 7 days
    const today = new Date();

    for (let dayIndex = 0; dayIndex < week.days.length; dayIndex++) {
      const day = week.days[dayIndex];
      const taskDate = new Date(today);
      taskDate.setDate(today.getDate() + dayIndex);
      const dateStr = taskDate.toISOString().split('T')[0];

      for (const task of day.tasks || []) {
        tasks.push({
          user_id: userId,
          title: task.title || `Practice ${task.type || 'skill'}`,
          description: task.description || 'Complete your scheduled practice',
          type: task.type || 'practice',
          duration: task.duration || 45,
          scheduled_date: dateStr,
          status: 'pending',
          priority: dayIndex === 0 ? 'high' : 'medium',
          metadata: task,
          created_at: new Date().toISOString()
        });
      }
    }
  }

  // If no tasks from plan, create default tasks
  if (tasks.length === 0) {
    const defaultTasks = [
      {
        title: 'Reading Practice - Passage 1',
        description: 'Complete a reading passage focusing on skimming and scanning',
        type: 'reading',
        duration: 30,
        priority: 'high'
      },
      {
        title: 'Vocabulary Building',
        description: 'Learn 20 new academic words',
        type: 'vocabulary',
        duration: 20,
        priority: 'medium'
      },
      {
        title: 'Listening Section 1 Practice',
        description: 'Practice with basic conversations',
        type: 'listening',
        duration: 25,
        priority: 'medium'
      },
      {
        title: 'Writing Task 1 - Data Analysis',
        description: 'Practice describing charts and graphs',
        type: 'writing',
        duration: 40,
        priority: 'high'
      }
    ];

    const today = new Date();
    defaultTasks.forEach((task, index) => {
      const taskDate = new Date(today);
      taskDate.setDate(today.getDate() + index);

      tasks.push({
        user_id: userId,
        ...task,
        scheduled_date: taskDate.toISOString().split('T')[0],
        status: 'pending',
        metadata: {},
        created_at: new Date().toISOString()
      });
    });
  }

  if (tasks.length > 0) {
    const { error } = await supabaseAdmin
      .from('tasks')
      .insert(tasks);

    if (error) {
      console.error('Error inserting tasks:', error);
    } else {
      console.log(`Generated ${tasks.length} initial tasks for user ${userId}`);
    }
  }
}

// Mock study plan generator for fallback
function generateMockStudyPlan(profile: any) {
  const weeksUntilExam = Math.ceil(
    (new Date(profile.exam_date).getTime() - new Date().getTime()) /
    (1000 * 60 * 60 * 24 * 7)
  );

  const totalWeeks = Math.min(weeksUntilExam, 12); // Max 12 weeks plan

  // Calculate skill gaps
  const target = profile.target_band || 7;
  const current = profile.baseline_scores || {
    reading: 6,
    writing: 5.5,
    listening: 6,
    speaking: 6
  };

  const weeks = [];

  for (let week = 1; week <= totalWeeks; week++) {
    const phase = week <= totalWeeks * 0.3 ? 'foundation' :
                  week <= totalWeeks * 0.7 ? 'practice' : 'mock-exam';

    weeks.push({
      weekNumber: week,
      focus: getWeekFocus(week, phase, profile.learning_style),
      skills: getSkillsForWeek(week, phase),
      days: generateDaysForWeek(week, phase, profile.learning_style),
      milestones: getMilestones(week, phase),
      practiceTest: week % 4 === 0 || phase === 'mock-exam'
    });
  }

  return {
    weeks,
    totalWeeks,
    skillGaps: {
      reading: target - current.reading,
      writing: target - current.writing,
      listening: target - current.listening,
      speaking: target - current.speaking
    },
    recommendations: getRecommendations(profile),
    mockTestSchedule: [
      { week: Math.floor(totalWeeks * 0.3), type: 'partial', skills: ['reading', 'listening'] },
      { week: Math.floor(totalWeeks * 0.6), type: 'partial', skills: ['writing', 'speaking'] },
      { week: Math.floor(totalWeeks * 0.9), type: 'full', skills: ['all'] }
    ]
  };
}

function getWeekFocus(week: number, phase: string, learningStyle: string): string {
  if (phase === 'foundation') {
    return `Building core skills and understanding test format`;
  } else if (phase === 'practice') {
    return `Intensive practice with ${learningStyle || 'mixed'} learning approach`;
  } else {
    return `Mock tests and exam strategy refinement`;
  }
}

function getSkillsForWeek(week: number, phase: string): string[] {
  const allSkills = ['reading', 'writing', 'listening', 'speaking'];

  if (phase === 'foundation') {
    // Focus on 2 skills per week in foundation phase
    return [allSkills[(week - 1) % 4], allSkills[(week) % 4]];
  } else if (phase === 'practice') {
    return allSkills; // All skills in practice phase
  } else {
    return allSkills; // All skills in mock exam phase
  }
}

function generateDaysForWeek(week: number, phase: string, learningStyle: string): any[] {
  const days = [];

  for (let day = 1; day <= 7; day++) {
    const tasks = [];

    // Morning task (always present)
    tasks.push({
      title: day === 1 ? 'Weekly Goal Setting' :
             day === 7 ? 'Weekly Review' :
             `Morning ${phase} practice`,
      description: getTaskDescription(day, phase, 'morning'),
      type: getTaskType(day, phase),
      duration: 30,
      resources: []
    });

    // Afternoon task on weekdays
    if (day <= 5) {
      tasks.push({
        title: `Afternoon skill development`,
        description: getTaskDescription(day, phase, 'afternoon'),
        type: getTaskType(day + 1, phase),
        duration: 45,
        resources: []
      });
    }

    // Evening task for specific days
    if (day === 3 || day === 6) {
      tasks.push({
        title: day === 3 ? 'Vocabulary Review' : 'Weekend Mock Test Practice',
        description: day === 3 ? 'Review and practice new vocabulary' : 'Complete a timed practice test section',
        type: day === 3 ? 'vocabulary' : 'practice-test',
        duration: 60,
        resources: []
      });
    }

    days.push({
      day,
      tasks
    });
  }

  return days;
}

function getTaskDescription(day: number, phase: string, timeOfDay: string): string {
  if (phase === 'foundation') {
    return `Build foundational skills with focused ${timeOfDay} practice`;
  } else if (phase === 'practice') {
    return `Intensive practice with timed exercises`;
  } else {
    return `Mock exam conditions practice`;
  }
}

function getTaskType(day: number, phase: string): string {
  const types = ['reading', 'writing', 'listening', 'speaking'];
  return types[(day - 1) % 4];
}

function getMilestones(week: number, phase: string): string[] {
  const milestones = [];

  if (week === 1) {
    milestones.push('Complete diagnostic assessment');
    milestones.push('Set up study schedule');
  }

  if (week % 4 === 0) {
    milestones.push('Complete progress review');
    milestones.push('Identify areas for improvement');
  }

  if (phase === 'mock-exam' && week % 2 === 0) {
    milestones.push('Complete full mock test');
    milestones.push('Analyze results and adjust plan');
  }

  return milestones;
}

function getRecommendations(profile: any): string[] {
  const recommendations = [];

  if (profile.learning_style === 'video') {
    recommendations.push('Focus on video lessons and tutorials');
    recommendations.push('Watch IELTS preparation channels');
  } else if (profile.learning_style === 'practice') {
    recommendations.push('Prioritize hands-on exercises and mock tests');
    recommendations.push('Use practice questions extensively');
  } else if (profile.learning_style === 'tips') {
    recommendations.push('Study strategy guides and tips');
    recommendations.push('Learn exam techniques and shortcuts');
  } else if (profile.learning_style === 'flashcards') {
    recommendations.push('Use spaced repetition for vocabulary');
    recommendations.push('Create digital flashcards for key concepts');
  }

  // Add skill-specific recommendations
  if (profile.baseline_scores) {
    if (profile.baseline_scores.writing < 6) {
      recommendations.push('Focus on basic essay structure and grammar');
    }
    if (profile.baseline_scores.speaking < 6) {
      recommendations.push('Practice speaking daily with recording');
    }
    if (profile.baseline_scores.reading < 6) {
      recommendations.push('Work on skimming and scanning techniques');
    }
    if (profile.baseline_scores.listening < 6) {
      recommendations.push('Practice with various accents daily');
    }
  }

  return recommendations;
}