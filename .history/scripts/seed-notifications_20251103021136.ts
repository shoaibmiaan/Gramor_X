import { createClient } from '@supabase/supabase-js';
import { NotificationService } from '@/lib/notificationService';
import { NOTIFICATION_TEMPLATES } from '@/lib/notificationTemplates';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const notificationService = new NotificationService(supabase);

async function seedNotificationsForUser(userId: string) {
  console.log(`Seeding notifications for user: ${userId}`);
  
  try {
    // Get all template keys
    const templateKeys = Object.keys(NOTIFICATION_TEMPLATES);
    
    // Create notifications for first 50 templates (to avoid overwhelming)
    const notificationsToCreate = templateKeys.slice(0, 50).map((key, index) => {
      const template = NOTIFICATION_TEMPLATES[key];
      const variables = generateVariablesForTemplate(key);
      
      return {
        templateKey: key,
        variables,
        // Stagger creation dates over past 30 days
        created_at: new Date(Date.now() - (index * 12 * 60 * 60 * 1000)) // 12 hours apart
      };
    });

    const results = await notificationService.bulkCreateNotifications(userId, notificationsToCreate);
    console.log(`✅ Created ${results.length} notifications for user ${userId}`);
    
    return results;
  } catch (error) {
    console.error('❌ Error seeding notifications:', error);
    throw error;
  }
}

function generateVariablesForTemplate(templateKey: string): Record<string, any> {
  const variables: Record<string, any> = {};
  
  // Sample data for template variables
  const sampleData = {
    course_name: ['Introduction to Programming', 'Web Development', 'Data Science', 'Machine Learning', 'Digital Marketing'],
    course_id: ['prog-101', 'web-101', 'ds-101', 'ml-101', 'dm-101'],
    achievement_name: ['Fast Learner', 'Consistent Student', 'Quiz Master', 'Community Helper', 'Early Adopter'],
    user_name: ['Alex Johnson', 'Maria Garcia', 'James Smith', 'Sarah Chen', 'Mike Brown'],
    amount: ['$49.99', '$99.99', '$24.99', '$199.99'],
    discount_percent: [10, 15, 20, 25, 30],
    rank: [1, 5, 10, 25, 50],
    skill_name: ['Python Programming', 'Data Analysis', 'Web Design', 'Project Management'],
    feature_name: ['Practice Mode', 'Study Groups', 'Progress Analytics', 'Mobile App']
  };

  // Map template keys to variables they need
  const variableMap: Record<string, string[]> = {
    'COURSE_ENROLLED': ['course_name', 'course_id'],
    'COURSE_PROGRESS_25': ['course_name', 'course_id'],
    'COURSE_PROGRESS_50': ['course_name', 'course_id'],
    'COURSE_PROGRESS_75': ['course_name', 'course_id'],
    'COURSE_COMPLETED': ['course_name', 'course_id'],
    'ACHIEVEMENT_UNLOCKED': ['achievement_name'],
    'PERFECT_QUIZ': ['quiz_name'],
    'RANK_UP': ['new_rank'],
    'FOLLOWED': ['follower_name'],
    'POST_LIKED': ['user_name', 'post_title'],
    'PAYMENT_SUCCESS': ['amount'],
    'LOYALTY_DISCOUNT': ['discount_percent'],
    'SKILL_VERIFIED': ['skill_name'],
    'NEW_FEATURE': ['feature_name']
  };

  const neededVars = variableMap[templateKey] || [];
  
  neededVars.forEach(varName => {
    const options = sampleData[varName as keyof typeof sampleData];
    if (options) {
      variables[varName] = options[Math.floor(Math.random() * options.length)];
    }
  });

  // Add some generic variables
  variables.completed_lessons = Math.floor(Math.random() * 20) + 5;
  variables.study_time = Math.floor(Math.random() * 15) + 5;
  variables.courses_completed = Math.floor(Math.random() * 5) + 1;
  variables.count = Math.floor(Math.random() * 10) + 1;

  return variables;
}

// Run for specific user
async function main() {
  const userId = process.argv[2]; // Get user ID from command line
  
  if (!userId) {
    console.error('Please provide a user ID: npm run seed:notifications <user-id>');
    process.exit(1);
  }

  await seedNotificationsForUser(userId);
}

if (require.main === module) {
  main().catch(console.error);
}

export { seedNotificationsForUser };