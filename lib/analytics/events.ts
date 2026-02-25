// lib/analytics/events.ts

// ---------- Types ----------
export type AnalyticsEventName =
  | 'signup'
  | 'onboarding_completed'
  | 'onboarding_start'
  | 'onboarding_step_complete'
  | 'onboarding_done'
  | 'profile_save'
  | 'studyplan_create'
  | 'studyplan_update'
  | 'saved_view'
  | 'saved_remove'
  | 'mock_started'
  | 'mock_completed'
  | 'ai_feedback_viewed'
  | 'paywall_view'
  | 'subscribe_clicked'
  | 'plan_purchased'
  | 'referral.code.create'
  | 'referral.code.redeem'
  | 'payments.intent.create'
  | 'payments.intent.success'
  | 'notification_enqueued'
  | 'delivery_sent'
  | 'delivery_failed'
  | 'exp.assign'
  | 'exp.expose'
  | 'exp.convert'
  | 'lifecycle.sent'
  | 'referral_link_created'
  | 'referral_redeemed'
  | 'partner_code_applied'
  | 'predictor_completed'
  | 'vocab_review_start'
  | 'vocab_review_finish'
  | 'grade_submitted'
  | 'speaking_attempt'
  | 'speaking_attempt_started'
  | 'speaking_attempt_scored'
  | 'writing_eval'
  | 'badge_unlocked'
  | 'challenge_started'
  | 'challenge_completed'
  | 'challenge_joined'
  | 'certificate_shared'
  | 'teacher_review_started'
  | 'teacher_review_completed'
  | 'teacher_review_scored'
  | 'writing_essay_scored'
  | 'writing.score.v2'
  | 'writing.view.band9'
  | 'writing.view.highlights'
  | 'writing.coach.entry'
  | 'writing.coach.view'
  | 'writing.coach.ask'
  | 'writing.coach.reply'
  | 'writing.coach.error'
  | 'analytics.progress.view'
  | 'analytics.writing.view'
  | 'analytics.writing.trend'
  | 'writing_attempt_started'
  | 'writing_attempt_saved'
  | 'writing_attempt_submitted'
  | 'writing_attempt_scored'
  | 'writing_attempt_metrics'
  | 'writing_redraft_created'
  | 'writing_drill_completed'
  | 'writing_readiness_passed'
  | 'writing_peer_review_submitted'
  | 'writing_band_report_generated'
  | 'writing_cross_evidence'
  | 'writing_cross_hedging'
  | 'writing_handwriting_uploaded'
  | 'xp.award.writing'
  | 'writing.results.view'
  | 'writing.results.share'
  | 'writing.results.analytics_click'
  | 'leaderboard.view.writing'
  | 'study_session_created'
  | 'study_session_started'
  | 'study_item_completed'
  | 'study_session_completed'
  | 'study_session_abandoned'
  | 'mobile.install_prompt.shown'
  | 'mobile.install_prompt.request'
  | 'mobile.install_prompt.result'
  | 'mobile.install_prompt.dismissed'
  | 'mobile.push_opt_in.shown'
  | 'mobile.push_opt_in.request'
  | 'mobile.push_opt_in.permission'
  | 'mobile.push_opt_in.dismissed'
  | 'vocab_word_viewed'
  | 'vocab_meaning_submitted'
  | 'vocab_sentence_submitted'
  | 'vocab_synonyms_submitted'
  | 'vocab_reward_shown'
  | 'vocab_share_clicked'
  | 'coach.writing.session'
  | 'coach.writing.reply'
  | 'reco_shown'
  | 'reco_accepted'
  | 'reco_skipped'
  | 'task_completed'
  | 'prompt_bookmarked'
  | 'prompt_unbookmarked'
  | 'prompt_started_mock'
  | 'prompt_started_coach'
  | 'prompt_randomized'
  | 'prompt_pack_viewed'
  | 'reading.highlight.add'
  | 'reading.note.add'
  | 'reading.flag.toggle'
  | 'reading.nav.filter'
  | 'flag.toggle'
  | 'export.pdf'
  | 'cert.view'
  | 'slo.breach'
  | 'ratelimit.block'
  | 'unsubscribe_clicked';

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

// ---------- Core Tracker ----------
export function track(event: AnalyticsEventName, payload: AnalyticsProps = {}): void {
  // No-op safely on SSR and in prod if no sink exists.
  if (typeof window === 'undefined') return;

  try {
    // Google gtag (if available)
    // @ts-expect-error TODO(gx): add gtag type
    window.gtag?.('event', event, payload);
  } catch {
    /* ignore */
  }

  try {
    // Generic dataLayer push (if available)
    // @ts-expect-error TODO(gx): add dataLayer type
    window.dataLayer?.push({ event, ...payload });
  } catch {
    /* ignore */
  }

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', event, payload);
  }
}
