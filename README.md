# Gramor_X

A Next.js (TypeScript) + Tailwind CSS portal with a separate **Premium “Exam Earth”** section using a dedicated Tailwind config.

## Tech Stack

- **Next.js** (App/Pages Router as in repo)
- **TypeScript**
- **Tailwind CSS** (two configs: default + premium)
- **Vercel** (recommended deploy target)

## Features

- Dual design systems (main portal + premium section)
- Production-ready scripts (lint, format, build)
- Vercel configuration included
- Teacher and admin flows consolidated into a single rollout (see [Teacher & Admin Workflow Overview](docs/teacher-admin-overview.md))


## Feature lifecycle

This repo tracks feature maturity in `config/feature-status.yml` using these statuses:

- `incomplete`: active exploration/buildout; broad edits are expected.
- `partial`: production feature with known gaps.
- `done`: hardened feature; changes are gated.

Each manifest entry includes `name`, `status`, `owner`, and `fileGlobs`.

### How to work with feature status

1. **Adding a new feature area**
   - Add a new entry in `config/feature-status.yml` with owner and globs before or alongside your first PR.
   - CI will fail if a new file under `pages/`, `components/`, or `lib/` is not covered by at least one manifest glob.

2. **Marking work as `incomplete`**
   - Use `incomplete` when architecture and UX are still moving.
   - Keep globs broad enough so follow-up files stay covered.

3. **Promoting from `incomplete`/`partial` to `done`**
   - Update the status to `done` in the manifest.
   - Add/confirm strict `CODEOWNERS` lines for the same globs.
   - Treat future edits as controlled changes requiring review from the owning team.

4. **Temporary unlocks for `done` features**
   - CI blocks edits to `done` feature files unless PR metadata includes the override tag: `feature-status-override`.
   - You can place the tag in the PR title, body, or labels (or set `FEATURE_STATUS_OVERRIDE=1` for local emergency runs).
   - Use this only for urgent fixes or approved migrations, then remove the tag in follow-up PRs when possible.

### Validation command

Run locally before opening a PR:

```bash
npm run validate:feature-status
```

## Getting Started

For a step-by-step onboarding checklist, see [Docs/new-developer-guide.md](Docs/new-developer-guide.md).

### Prerequisites

- **Node.js 20** (LTS)
- **npm** (or pnpm/yarn)
- A copy of `.env` created from `.env.example` (set values as needed)

### Install

```bash
npm install

```

### Run

Copy the example environment file and start the development server:

```bash
cp .env.example .env
npm run dev
```

Update values in `.env` as needed before running the app.

### Environment Variables

Copy `.env.example` to `.env` and set the required values. The following variables are recognized:

| Variable                        | Required for local dev?        | Example value                        |
| ------------------------------- | ------------------------------ | ------------------------------------ |
| `NODE_ENV`                      | ✅                             | `development`                        |
| `SITE_URL`                      | ✅                             | `http://localhost:3000`              |
| `NEXT_PUBLIC_SITE_URL`          | ✅                             | `http://localhost:3000`              |
| `NEXT_PUBLIC_BASE_URL`          | Optional                       | `http://localhost:3000`              |
| `NEXT_PUBLIC_SUPABASE_URL`      | Required if using Supabase     | `http://localhost:54321`             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required if using Supabase     | `anon_key`                           |
| `SUPABASE_URL`                  | Required if using Supabase     | `http://localhost:54321`             |
| `SUPABASE_SERVICE_KEY`          | Required if using Supabase     | `service_key`                        |
| `SUPABASE_SERVICE_ROLE_KEY`     | Required if using Supabase     | `service_role_key`                   |
| `GX_AI_PROVIDER`                | Optional                       | `openai`                             |
| `OPENAI_API_KEY`                | Optional                       | `sk-test`                            |
| `OPENAI_MODEL`                  | Optional                       | `gpt-4o`                             |
| `OPENAI_WRITING_MODEL`          | Optional                       |                                      |
| `OPENAI_SPEAKING_MODEL`         | Optional                       |                                      |
| `GOOGLE_GENERATIVE_AI_API_KEY`  | Optional                       |                                      |
| `GEMINI_API_KEY`                | Optional                       |                                      |
| `GROQ_API_KEY`                  | Optional                       |                                      |
| `GROQ_MODEL`                    | Optional                       |                                      |
| `STRIPE_SECRET_KEY`             | Optional                       | `sk_test_123`                        |
| `STRIPE_WEBHOOK_SECRET`         | Optional                       | `whsec_test`                         |
| `TWILIO_ACCOUNT_SID`            | Optional (required for Twilio) | `ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` |
| `TWILIO_AUTH_TOKEN`             | Optional                       | `auth_token`                         |
| `TWILIO_VERIFY_SERVICE_SID`     | Optional                       | `VAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` |
| `TWILIO_WHATSAPP_FROM`          | Optional                       | `whatsapp:+10000000000`              |
| `TWILIO_BYPASS`                 | Optional                       | `true`                               |
| `NEXT_PUBLIC_TWILIO_BYPASS`     | Optional                       | `true`                               |
| `LIMIT_FREE_READING`            | Optional                       | `20`                                 |
| `LIMIT_FREE_LISTENING`          | Optional                       | `10`                                 |
| `SKIP_ENV_VALIDATION`           | Optional                       | `false`                              |

These defaults mirror the placeholders in `.env.example` and can prevent startup failures during development. For a step-by-step walkthrough of each field (including optional services like Supabase, AI providers, Stripe, and Twilio) see [docs/setup/environment.md](docs/setup/environment.md).

# test trigger Sun Nov 2 18:24:02 PKT 2025
