# Security and RLS notes

- All admin APIs wrap handlers in `lib/api/withPlan` which enforces plan + role checks.
- Feature flag updates require `master` plan and `admin` role; `withPlan` rejects others with 402 or 401.
- Rate-limit abuse events are logged to `api_abuse_log` for auditing.
- Soft-deletion columns (`deleted_at`) ensure PII can be purged via retention jobs.
- Use Supabase policies to restrict `api_abuse_log` and `feature_flags` to admin roles only.
