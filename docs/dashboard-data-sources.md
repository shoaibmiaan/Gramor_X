# Phase 5 Dashboard Data Sources

## Metrics map

| Metric | Source table(s) | Notes |
|---|---|---|
| Estimated Band Score | `user_scores`, fallback `score_history` | Uses latest `current_band`, then latest scored history point. |
| Skill Heatmap | `reading_sessions` (plus computed placeholders for other skills) | Reading is measured directly; other skills are normalized until dedicated per-skill tables are available. |
| Strengths / Weaknesses | Derived from heatmap | Top 2 and bottom 2 skills by normalized score. |
| Study Streak | `streak_logs` | Uses latest `streak_days`. |
| Improvement Graph | `score_history` | Time-series points from `occurred_at` and `band`. |
| Usage meters | `usage_tracking` through `/api/usage/[feature]` | Per-feature daily request counters with plan limits. |
| Billing invoices | Stripe invoices via `/api/billing/invoices` | Uses `subscriptions.stripe_customer_id` as source-of-truth identifier. |
| Active sessions | `auth.sessions` via `/api/auth/sessions` | Shown in security settings. |
| Login history | `login_events` via `/api/auth/login-events` | Includes timestamp, ip, user agent. |

## Service and hook layer

- Service: `lib/dashboard.ts`
- API: `pages/api/dashboard/overview.ts`
- Hooks: `hooks/useDashboard.ts`

