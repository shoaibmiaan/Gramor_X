# GDPR Data Inventory

## Personal-data tables and purpose

| Table | Personal data | Purpose | Retention |
|---|---|---|---|
| `profiles` | name, email, role, locale, onboarding fields | account identity and personalization | until account deletion request is processed |
| `subscriptions` | user_id, payment identifiers, plan/status | billing entitlement | retained for compliance and invoicing audits |
| `invoices` | billing records, amounts, status | financial records | accounting retention policy |
| `usage_tracking` | user_id, feature usage, tokens | quota enforcement and analytics | rolling analytics window + compliance archive |
| `audit_logs` | user_id, IP, user-agent, metadata | security and compliance auditing | security retention policy |
| `alerts` | user_id and suspicious-pattern details | abuse/suspicious-activity workflow | until resolved + archival period |
| `contracts` | contract metadata and file URL | enterprise access and legal records | contract lifecycle + legal retention |
| `enterprise_inquiries` | contact details and company message | sales lead management | CRM lifecycle policy |

## Data flows
1. **Signup/Auth** → `profiles` + auth provider records.
2. **Billing checkout/webhooks** → `subscriptions`, `invoices`, payment events.
3. **AI usage** → `usage_tracking`, optional audit trail.
4. **Security events** → `audit_logs`, anomaly rules → `alerts`.
5. **Enterprise sales** → `enterprise_inquiries`, `contracts`.

## User rights implementation mapping
- Data export: `GET /api/user/export-data` (backed by account export flow).
- Account deletion: `POST /api/account/delete` with re-auth freshness requirement and queue/grace period.
- Privacy policy and terms: `/legal/privacy`, `/legal/terms`.
- Cookie preference: consent banner at runtime, preference stored client-side.

## Third-party processors
- Supabase (authentication/database/storage)
- Stripe (payment processing/invoicing)
- Optional email/notification processors (transactional messaging)
