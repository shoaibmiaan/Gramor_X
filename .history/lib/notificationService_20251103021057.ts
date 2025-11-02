import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { CreateNotificationInput, NotificationNudge } from './schemas/notifications';
import { getNotificationTemplate, type NotificationTemplate } from './notificationTemplates';

export class NotificationService {
  constructor(private supabase: ReturnType<typeof createClient<Database>>) {}

  // ... existing methods ...

  async createNotificationFromTemplate(
    userId: string,
    templateKey: string,
    variables?: Record<string, any>
  ): Promise<NotificationNudge> {
    const template = getNotificationTemplate(templateKey, variables);
    
    return this.createNotification(userId, {
      message: template.message,
      url: template.url
    });
  }

  async bulkCreateNotifications(
    userId: string,
    notifications: Array<{
      templateKey: string;
      variables?: Record<string, any>;
      created_at?: Date;
    }>
  ): Promise<NotificationNudge[]> {
    const results: NotificationNudge[] = [];
    
    for (const notification of notifications) {
      try {
        const result = await this.createNotificationFromTemplate(
          userId,
          notification.templateKey,
          notification.variables
        );
        results.push(result);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to create notification ${notification.templateKey}:`, error);
      }
    }
    
    return results;
  }

  async seedUserNotifications(userId: string): Promise<void> {
    const notifications = [
      // Onboarding sequence
      { templateKey: 'WELCOME' },
      { templateKey: 'PROFILE_COMPLETE' },
      { templateKey: 'FIRST_LOGIN' },
      { templateKey: 'LEARNING_PATH' },
      
      // Course enrollments
      { 
        templateKey: 'COURSE_ENROLLED', 
        variables: { course_name: 'Introduction to Programming', course_id: 'prog-101' } 
      },
      { 
        templateKey: 'COURSE_PROGRESS_25', 
        variables: { course_name: 'Introduction to Programming', course_id: 'prog-101' } 
      },
      { 
        templateKey: 'COURSE_PROGRESS_50', 
        variables: { course_name: 'Introduction to Programming', course_id: 'prog-101' } 
      },
      { 
        templateKey: 'COURSE_PROGRESS_75', 
        variables: { course_name: 'Introduction to Programming', course_id: 'prog-101' } 
      },
      { 
        templateKey: 'COURSE_COMPLETED', 
        variables: { course_name: 'Introduction to Programming', course_id: 'prog-101' } 
      },
      
      // Achievements
      { templateKey: 'FIRST_COURSE_COMPLETE' },
      { templateKey: 'LEARNING_STREAK_3' },
      { templateKey: 'LEARNING_STREAK_7' },
      { 
        templateKey: 'ACHIEVEMENT_UNLOCKED', 
        variables: { achievement_name: 'Fast Learner' } 
      },
      { 
        templateKey: 'PERFECT_QUIZ', 
        variables: { quiz_name: 'Python Basics Quiz' } 
      },
      
      // Additional courses
      { 
        templateKey: 'COURSE_ENROLLED', 
        variables: { course_name: 'Web Development Fundamentals', course_id: 'web-101' } 
      },
      { 
        templateKey: 'COURSE_ENROLLED', 
        variables: { course_name: 'Data Science Essentials', course_id: 'ds-101' } 
      },
      
      // Progress updates
      { 
        templateKey: 'WEEKLY_PROGRESS', 
        variables: { completed_lessons: 12, study_time: 8 } 
      },
      { 
        templateKey: 'MONTHLY_REVIEW', 
        variables: { courses_completed: 3 } 
      },
      
      // Community
      { 
        templateKey: 'FOLLOWED', 
        variables: { follower_name: 'Alex Johnson' } 
      },
      { 
        templateKey: 'POST_LIKED', 
        variables: { user_name: 'Maria Garcia', post_title: 'My learning journey so far' } 
      },
      { 
        templateKey: 'STUDY_GROUP_INVITE', 
        variables: { group_name: 'Python Learners Club' } 
      }
    ];

    await this.bulkCreateNotifications(userId, notifications);
  }
}