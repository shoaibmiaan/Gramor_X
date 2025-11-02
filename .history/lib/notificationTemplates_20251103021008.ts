export interface NotificationTemplate {
  event_key: string;
  message: string;
  url?: string;
  channels?: string[];
  payload?: Record<string, any>;
}

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  // 🎯 User Onboarding & Welcome (10)
  WELCOME: {
    event_key: 'welcome',
    message: '🎉 Welcome to GramorX! Start your learning journey today.',
    url: '/onboarding',
    channels: ['in_app', 'email']
  },
  PROFILE_COMPLETE: {
    event_key: 'profile_complete',
    message: '✅ Profile completed! You’re all set to explore courses.',
    url: '/profile'
  },
  FIRST_LOGIN: {
    event_key: 'first_login',
    message: '👋 Great to see you! Check out our beginner-friendly courses.',
    url: '/courses?level=beginner'
  },
  MOBILE_APP: {
    event_key: 'mobile_app',
    message: '📱 Get our mobile app for learning on the go!',
    url: '/mobile-app'
  },
  INTRO_VIDEO: {
    event_key: 'intro_video',
    message: '🎬 Watch our platform intro to get started quickly.',
    url: '/intro'
  },
  COMMUNITY_JOIN: {
    event_key: 'community_join',
    message: '👥 Join our learner community for support and discussions.',
    url: '/community'
  },
  LEARNING_PATH: {
    event_key: 'learning_path',
    message: '🗺️ Your personalized learning path is ready!',
    url: '/learning-path'
  },
  GOAL_SETTING: {
    event_key: 'goal_setting',
    message: '🎯 Set your first learning goal to stay motivated.',
    url: '/goals'
  },
  PREFERENCES: {
    event_key: 'preferences',
    message: '⚙️ Customize your learning preferences for better experience.',
    url: '/settings/preferences'
  },
  NOTIFICATION_SETUP: {
    event_key: 'notification_setup',
    message: '🔔 Set up notifications to never miss important updates.',
    url: '/settings/notifications'
  },

  // 📚 Course & Learning (25)
  COURSE_ENROLLED: {
    event_key: 'course_enrolled',
    message: '📖 You enrolled in "{course_name}"! Start learning now.',
    url: '/learning/{course_id}'
  },
  COURSE_PROGRESS_25: {
    event_key: 'course_progress_25',
    message: '📊 You’re 25% through "{course_name}"! Keep going!',
    url: '/learning/{course_id}'
  },
  COURSE_PROGRESS_50: {
    event_key: 'course_progress_50',
    message: '🎯 Halfway through "{course_name}"! You’re doing great.',
    url: '/learning/{course_id}'
  },
  COURSE_PROGRESS_75: {
    event_key: 'course_progress_75',
    message: '🚀 75% complete in "{course_name}"! Almost there.',
    url: '/learning/{course_id}'
  },
  COURSE_COMPLETED: {
    event_key: 'course_completed',
    message: '🏆 Congratulations! You completed "{course_name}"!',
    url: '/certificate/{course_id}'
  },
  NEW_COURSE_AVAILABLE: {
    event_key: 'new_course',
    message: '🆕 New course available: "{course_name}"',
    url: '/courses/{course_id}'
  },
  COURSE_UPDATE: {
    event_key: 'course_update',
    message: '🔄 "{course_name}" has been updated with new content.',
    url: '/learning/{course_id}'
  },
  PREREQUISITE_MET: {
    event_key: 'prerequisite_met',
    message: '✅ You can now access "{course_name}" - prerequisites completed!',
    url: '/courses/{course_id}'
  },
  LEARNING_REMINDER: {
    event_key: 'learning_reminder',
    message: '📚 Time for your daily learning session!',
    url: '/learning'
  },
  WEEKLY_PROGRESS: {
    event_key: 'weekly_progress',
    message: '📈 This week: {completed_lessons} lessons, {study_time} hours studied.',
    url: '/progress'
  },
  MONTHLY_REVIEW: {
    event_key: 'monthly_review',
    message: '📊 Monthly learning report: {courses_completed} courses finished!',
    url: '/reports/monthly'
  },
  COURSE_RECOMMENDATION: {
    event_key: 'course_recommendation',
    message: '💡 Based on your progress, you might like "{course_name}"',
    url: '/courses/{course_id}'
  },
  DIFFICULTY_ADJUSTED: {
    event_key: 'difficulty_adjusted',
    message: '🎛️ Course difficulty adjusted based on your performance.',
    url: '/learning/{course_id}'
  },
  LEARNING_STREAK_3: {
    event_key: 'learning_streak_3',
    message: '🔥 3-day learning streak! Keep the momentum going.',
    url: '/streaks'
  },
  LEARNING_STREAK_7: {
    event_key: 'learning_streak_7',
    message: '🔥 7-day streak! You’re building great habits.',
    url: '/streaks'
  },
  LEARNING_STREAK_30: {
    event_key: 'learning_streak_30',
    message: '🔥 30-day streak! Amazing consistency!',
    url: '/streaks'
  },
  STUDY_GROUP_INVITE: {
    event_key: 'study_group_invite',
    message: '👥 You’ve been invited to join "{group_name}" study group',
    url: '/groups/{group_id}'
  },
  PEER_HELP: {
    event_key: 'peer_help',
    message: '🤝 {student_name} asked a question in your study group',
    url: '/groups/{group_id}/discussion'
  },
  EXPERT_QA: {
    event_key: 'expert_qa',
    message: '🎤 Live Q&A session with {expert_name} starting soon',
    url: '/live-sessions/{session_id}'
  },
  COURSE_DEADLINE: {
    event_key: 'course_deadline',
    message: '⏰ "{course_name}" access expires in {days_left} days',
    url: '/learning/{course_id}'
  },
  CERTIFICATE_READY: {
    event_key: 'certificate_ready',
    message: '📜 Your certificate for "{course_name}" is ready!',
    url: '/certificate/{course_id}'
  },
  SKILL_VERIFIED: {
    event_key: 'skill_verified',
    message: '✅ Your {skill_name} skill has been verified!',
    url: '/skills'
  },
  LEARNING_PATH_UPDATED: {
    event_key: 'learning_path_updated',
    message: '🔄 Your learning path has been updated with new recommendations',
    url: '/learning-path'
  },
  KNOWLEDGE_CHECK: {
    event_key: 'knowledge_check',
    message: '🧠 Time for a quick review of what you’ve learned recently',
    url: '/review'
  },

  // 🏆 Achievements & Milestones (20)
  ACHIEVEMENT_UNLOCKED: {
    event_key: 'achievement_unlocked',
    message: '🏆 Achievement unlocked: "{achievement_name}"!',
    url: '/achievements'
  },
  FIRST_COURSE_COMPLETE: {
    event_key: 'first_course_complete',
    message: '🎯 You completed your first course! Learning journey begins.',
    url: '/achievements'
  },
  PERFECT_QUIZ: {
    event_key: 'perfect_quiz',
    message: '💯 Perfect score on "{quiz_name}"! Excellent work.',
    url: '/quizzes/{quiz_id}/results'
  },
  RANK_UP: {
    event_key: 'rank_up',
    message: '⭐ Rank upgraded to {new_rank}! Keep climbing.',
    url: '/profile/rank'
  },
  TOP_LEARNER: {
    event_key: 'top_learner',
    message: '👑 You’re in top 10% of learners this week!',
    url: '/leaderboard'
  },
  CONSISTENCY_AWARD: {
    event_key: 'consistency_award',
    message: '📅 Consistency award: You learned every day this month!',
    url: '/achievements'
  },
  SPEED_LEARNER: {
    event_key: 'speed_learner',
    message: '⚡ Speed learner: Completed course faster than 90% of students!',
    url: '/achievements'
  },
  HELPful_LEARNER: {
    event_key: 'helpful_learner',
    message: '🤝 Helpful learner: Your answers helped {count} peers!',
    url: '/community/contributions'
  },
  EARLY_ADOPTER: {
    event_key: 'early_adopter',
    message: '🚀 Early adopter: You were among first to try new feature!',
    url: '/achievements'
  },
  KNOWLEDGE_SHARER: {
    event_key: 'knowledge_sharer',
    message: '📢 Knowledge sharer: You shared {count} learning insights!',
    url: '/community/contributions'
  },
  WEEKLY_CHALLENGE_WIN: {
    event_key: 'weekly_challenge_win',
    message: '🎯 You won this week\'s learning challenge!',
    url: '/challenges'
  },
  MILESTONE_10_COURSES: {
    event_key: 'milestone_10_courses',
    message: '🔟 Milestone: 10 courses completed! Learning machine!',
    url: '/achievements'
  },
  MILESTONE_100_HOURS: {
    event_key: 'milestone_100_hours',
    message: '⏱️ 100 hours of learning completed! Incredible dedication.',
    url: '/achievements'
  },
  PERFECT_ATTENDANCE: {
    event_key: 'perfect_attendance',
    message: '📚 Perfect attendance: No missed learning days this month!',
    url: '/achievements'
  },
  CROSS_DISCIPLINE: {
    event_key: 'cross_discipline',
    message: '🌐 Cross-discipline explorer: Completed courses in {count} categories!',
    url: '/achievements'
  },
  QUIZ_MASTER: {
    event_key: 'quiz_master',
    message: '🧠 Quiz master: Perfect scores on {count} consecutive quizzes!',
    url: '/achievements'
  },
  NIGHT_OWL: {
    event_key: 'night_owl',
    message: '🦉 Night owl: Most productive during late hours!',
    url: '/achievements'
  },
  EARLY_BIRD: {
    event_key: 'early_bird',
    message: '🐦 Early bird: Consistent morning learning sessions!',
    url: '/achievements'
  },
  WEEKEND_WARRIOR: {
    event_key: 'weekend_warrior',
    message: '💪 Weekend warrior: Maximum learning on weekends!',
    url: '/achievements'
  },
  GLOBAL_RANK: {
    event_key: 'global_rank',
    message: '🌎 Global rank #{rank} - Among top learners worldwide!',
    url: '/leaderboard'
  },

  // 💰 Payments & Subscriptions (15)
  PAYMENT_SUCCESS: {
    event_key: 'payment_success',
    message: '✅ Payment successful! Thank you for your purchase.',
    url: '/billing/receipts/{payment_id}'
  },
  SUBSCRIPTION_RENEWAL: {
    event_key: 'subscription_renewal',
    message: '🔄 Subscription renewed successfully.',
    url: '/billing/subscriptions'
  },
  SUBSCRIPTION_UPGRADE: {
    event_key: 'subscription_upgrade',
    message: '⬆️ Subscription upgraded to {plan_name}! New features unlocked.',
    url: '/billing/subscriptions'
  },
  TRIAL_ENDS_SOON: {
    event_key: 'trial_ends_soon',
    message: '⏰ Your free trial ends in {days_left} days.',
    url: '/billing/upgrade'
  },
  TRIAL_EXPIRED: {
    event_key: 'trial_expired',
    message: '🔒 Trial period ended. Upgrade to continue learning.',
    url: '/billing/upgrade'
  },
  PAYMENT_FAILED: {
    event_key: 'payment_failed',
    message: '❌ Payment failed. Please update your payment method.',
    url: '/billing/payment-methods'
  },
  REFUND_PROCESSED: {
    event_key: 'refund_processed',
    message: '💸 Refund processed for {amount}.',
    url: '/billing/receipts'
  },
  DISCOUNT_APPLIED: {
    event_key: 'discount_applied',
    message: '🎫 Discount applied! You saved {discount_amount}.',
    url: '/billing/receipts/{payment_id}'
  },
  LOYALTY_DISCOUNT: {
    event_key: 'loyalty_discount',
    message: '🎁 Loyalty discount: {discount_percent}% off for being a valued member!',
    url: '/billing'
  },
  BULK_PURCHASE: {
    event_key: 'bulk_purchase',
    message: '📦 Bulk purchase: {course_count} courses added to your library!',
    url: '/library'
  },
  GIFT_SENT: {
    event_key: 'gift_sent',
    message: '🎁 Gift sent to {recipient_name}! They’ll love learning with us.',
    url: '/gifts/sent'
  },
  GIFT_RECEIVED: {
    event_key: 'gift_received',
    message: '🎉 You received a gift from {sender_name}! Start learning now.',
    url: '/gifts/received'
  },
  AFFILIATE_EARNED: {
    event_key: 'affiliate_earned',
    message: '💰 Affiliate earnings: {amount} earned from referrals!',
    url: '/affiliate'
  },
  SCHOLARSHIP_APPLIED: {
    event_key: 'scholarship_applied',
    message: '📝 Scholarship application received! Decision in 3-5 days.',
    url: '/scholarships'
  },
  SCHOLARSHIP_APPROVED: {
    event_key: 'scholarship_approved',
    message: '🎓 Scholarship approved! {coverage}% of your courses covered.',
    url: '/scholarships'
  },

  // 🔔 System & Platform (15)
  SYSTEM_MAINTENANCE: {
    event_key: 'system_maintenance',
    message: '🔧 Scheduled maintenance in {hours} hours. Platform may be unavailable.',
    url: '/status'
  },
  NEW_FEATURE: {
    event_key: 'new_feature',
    message: '🆕 New feature: {feature_name}! Check it out now.',
    url: '/whats-new'
  },
  APP_UPDATE: {
    event_key: 'app_update',
    message: '📱 App update available with new features and improvements.',
    url: '/mobile-app'
  },
  SECURITY_ALERT: {
    event_key: 'security_alert',
    message: '🔒 Security alert: Unusual login detected from {location}',
    url: '/security'
  },
  PASSWORD_CHANGED: {
    event_key: 'password_changed',
    message: '🔑 Password changed successfully.',
    url: '/security'
  },
  EMAIL_VERIFIED: {
    event_key: 'email_verified',
    message: '✅ Email verified successfully!',
    url: '/profile'
  },
  TWO_FACTOR_ENABLED: {
    event_key: 'two_factor_enabled',
    message: '🛡️ Two-factor authentication enabled for extra security.',
    url: '/security'
  },
  DATA_EXPORT_READY: {
    event_key: 'data_export_ready',
    message: '📤 Your data export is ready for download.',
    url: '/settings/privacy'
  },
  PRIVACY_POLICY_UPDATE: {
    event_key: 'privacy_policy_update',
    message: '📄 Privacy policy updated. Please review changes.',
    url: '/privacy-policy'
  },
  COMMUNITY_GUIDELINES: {
    event_key: 'community_guidelines',
    message: '📖 Updated community guidelines. Help keep our platform positive.',
    url: '/community/guidelines'
  },
  FEEDBACK_REQUEST: {
    event_key: 'feedback_request',
    message: '💬 How was your learning experience? Share your feedback.',
    url: '/feedback'
  },
  SURVEY_INVITE: {
    event_key: 'survey_invite',
    message: '📋 Quick survey: Help us improve GramorX (2 min)',
    url: '/surveys/{survey_id}'
  },
  BUG_REPORT_STATUS: {
    event_key: 'bug_report_status',
    message: '🐛 Your bug report has been {status}. Thank you!',
    url: '/support/tickets/{ticket_id}'
  },
  FEATURE_REQUEST_UPDATE: {
    event_key: 'feature_request_update',
    message: '💡 Your feature request "{feature_name}" is under review!',
    url: '/feature-requests'
  },
  SUPPORT_TICKET_UPDATE: {
    event_key: 'support_ticket_update',
    message: '📞 Update on your support ticket: {update_message}',
    url: '/support/tickets/{ticket_id}'
  },

  // 👥 Social & Community (15)
  FOLLOWED: {
    event_key: 'followed',
    message: '👤 {follower_name} started following you!',
    url: '/profile/{follower_id}'
  },
  PROFILE_VIEW: {
    event_key: 'profile_view',
    message: '👀 {viewer_name} viewed your profile.',
    url: '/profile/views'
  },
  POST_LIKED: {
    event_key: 'post_liked',
    message: '❤️ {user_name} liked your post "{post_title}"',
    url: '/community/posts/{post_id}'
  },
  COMMENT_REPLY: {
    event_key: 'comment_reply',
    message: '💬 {user_name} replied to your comment',
    url: '/community/posts/{post_id}#comment-{comment_id}'
  },
  MENTIONED: {
    event_key: 'mentioned',
    message: '📍 {user_name} mentioned you in a post',
    url: '/community/posts/{post_id}'
  },
  STUDY_BUDDY_REQUEST: {
    event_key: 'study_buddy_request',
    message: '🤝 Study buddy request from {user_name}',
    url: '/study-buddies/requests'
  },
  STUDY_BUDDY_ACCEPTED: {
    event_key: 'study_buddy_accepted',
    message: '✅ {user_name} accepted your study buddy request!',
    url: '/study-buddies/{buddy_id}'
  },
  GROUP_INVITE: {
    event_key: 'group_invite',
    message: '👥 Invitation to join "{group_name}" study group',
    url: '/groups/invitations'
  },
  GROUP_EVENT: {
    event_key: 'group_event',
    message: '📅 Upcoming group event: "{event_name}"',
    url: '/groups/{group_id}/events/{event_id}'
  },
  COMMUNITY_CHALLENGE: {
    event_key: 'community_challenge',
    message: '🏅 New community challenge: "{challenge_name}"',
    url: '/community/challenges/{challenge_id}'
  },
  BADGE_EARNED: {
    event_key: 'badge_earned',
    message: '🎖️ Community badge earned: "{badge_name}"',
    url: '/profile/badges'
  },
  CONTRIBUTION_RECOGNIZED: {
    event_key: 'contribution_recognized',
    message: '🌟 Your community contribution was recognized by moderators!',
    url: '/community/contributions'
  },
  PEER_REVIEW_REQUEST: {
    event_key: 'peer_review_request',
    message: '🔍 Peer review requested for your project submission',
    url: '/projects/{project_id}/reviews'
  },
  PEER_REVIEW_COMPLETE: {
    event_key: 'peer_review_complete',
    message: '✅ Peer review completed for your project',
    url: '/projects/{project_id}/results'
  },
  COMMUNITY_RANK_UP: {
    event_key: 'community_rank_up',
    message: '⭐ Community rank upgraded to {new_rank}!',
    url: '/community/rank'
  }
};

export const getNotificationTemplate = (key: string, variables?: Record<string, any>): NotificationTemplate => {
  const template = NOTIFICATION_TEMPLATES[key];
  if (!template) {
    return {
      event_key: 'generic',
      message: 'You have a new notification',
      url: '/notifications'
    };
  }

  // Replace variables in message and URL
  let message = template.message;
  let url = template.url;

  if (variables) {
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
      if (url) {
        url = url.replace(new RegExp(placeholder, 'g'), String(value));
      }
    });
  }

  return {
    ...template,
    message,
    url
  };
};