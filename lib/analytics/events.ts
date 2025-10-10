// lib/analytics/events.ts

export type AnalyticsEventName =
  | 'signup'
  | 'onboarding_completed'
  | 'mock_started'
  | 'mock_completed'
  | 'ai_feedback_viewed'
  | 'paywall_view'
  | 'subscribe_clicked'
  | 'plan_purchased'
  | 'referral_link_created'
  | 'referral_redeemed'
  | 'partner_code_applied'
  | 'predictor_completed'
  | 'challenge_joined'
  | 'certificate_shared'
  | 'teacher_review_started'
  | 'teacher_review_completed'
  | 'teacher_review_scored'
  | 'writing_essay_scored'
  | 'saved_view'
  | 'saved_remove';

export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>;
