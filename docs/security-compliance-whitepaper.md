# Security & Compliance Whitepaper (Product-Level)

## Identity and access controls
- Server-side authentication and role checks for protected APIs.
- Admin-only APIs guarded with role checks and RLS admin overrides.

## Data protection model
- Sensitive tables protected by RLS.
- Audit events recorded for auth, profile, billing, and security-sensitive actions.
- Suspicious pattern detection generates resolvable admin alerts.

## Billing and entitlement controls
- Subscription status source-of-truth in `subscriptions`.
- Webhook sync for payment state transitions.
- Usage limits enforced in server guard paths.

## Compliance controls
- Data export and account deletion workflows available for user rights requests.
- Legal pages published for privacy and terms.
- Cookie consent preference flow implemented for optional cookies.

## Enterprise controls
- Feature flag system for controlled rollout.
- Enterprise inquiry + contracts + manual invoice paths.
- Investor metrics and architecture/compliance documentation.

## Recommended next controls
- External SIEM log forwarding and immutable audit snapshots.
- Formal penetration testing and recurring policy review.
- DPA and regional data-processing appendices.
