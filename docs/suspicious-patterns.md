# Suspicious Activity Patterns (Phase 7)

This document defines the baseline suspicious-activity rules used by `POST /api/cron/detect-suspicious`.

## Detection window
- Rolling 24 hours.

## Rule set

1. **Failed login spike**
   - Signal: `audit_logs.action = 'login_failed'`
   - Threshold: `>= 10` events for the same `user_id` in 24h.
   - Severity:
     - `high` for 10–19
     - `critical` for 20+
   - Alert type: `failed_login_spike`

2. **Usage-limit exceeded spike**
   - Signal: `audit_logs.action = 'usage_limit_exceeded'`
   - Threshold: `>= 15` events for the same `user_id` in 24h.
   - Severity:
     - `medium` for 15–39
     - `critical` for 40+
   - Alert type: `usage_limit_exceeded_spike`

## Alert handling
- Alerts are stored in `public.alerts`.
- Admins can view/resolve alerts in `/admin/alerts`.
- Resolve operation records `resolved=true` and `resolved_at` timestamp.

## Planned expansions
- Login-from-new-device followed by sensitive account changes.
- Multiple role-change attempts in a short period.
- Burst of webhook failures or subscription downgrades.
