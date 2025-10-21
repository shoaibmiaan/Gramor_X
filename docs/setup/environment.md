# Local Environment Setup

This guide walks through configuring a fully working local environment for **Gramor_X**. Each environment variable is documented "field by field" so you can copy `.env.example`, fill in the required values, and understand when optional values are needed.

> **Tip:** Keep this guide open while you edit your `.env` file. The tables below list whether each field is required for common features and what a typical development value looks like.

## 1. Prerequisites

| Requirement                     | Notes                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Node.js 20**                  | Matches the version used in CI/production. Install via [nvm](https://github.com/nvm-sh/nvm) or your preferred tool. |
| **npm 9+**                      | Bundled with Node 20.                                                                                               |
| **Supabase CLI (optional)**     | Install if you want to run the Supabase database locally.                                                           |
| **OpenAI/Groq keys (optional)** | Only needed if you plan to exercise AI-backed endpoints locally.                                                    |

Once these are installed, run:

```bash
npm install
cp .env.example .env
```

## 2. Core application fields

These values are required for any local run.

| Variable               | Required | Example                 | Explanation                                                           |
| ---------------------- | -------- | ----------------------- | --------------------------------------------------------------------- |
| `NODE_ENV`             | ✅       | `development`           | Keeps Next.js in development mode.                                    |
| `SITE_URL`             | ✅       | `http://localhost:3000` | Canonical URL used by various helpers.                                |
| `NEXT_PUBLIC_SITE_URL` | ✅       | `http://localhost:3000` | Exposed to the browser so front-end links resolve correctly.          |
| `NEXT_PUBLIC_BASE_URL` | Optional | `http://localhost:3000` | Overrides the base URL used in client fetchers if you proxy requests. |

## 3. Supabase configuration

Supabase powers authentication, word-of-the-day data, and XP tracking.

| Variable                        | Required for Supabase? | Example                  | Where to find it                                                                                                       |
| ------------------------------- | ---------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅                     | `http://localhost:54321` | From the Supabase project settings → API. Use `http://localhost:54321` when running the Supabase Docker stack locally. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅                     | `public-anon-key`        | Copy from Supabase → API → Project API keys.                                                                           |
| `SUPABASE_URL`                  | ✅                     | `http://localhost:54321` | Same as the public URL but used server-side.                                                                           |
| `SUPABASE_SERVICE_KEY`          | ✅                     | `service-role-key`       | Service role key (never expose to clients). Required for local scripts and API routes that use elevated permissions.   |
| `SUPABASE_SERVICE_ROLE_KEY`     | ✅                     | `service-role-key`       | Alias of the service key. Keep both values identical so existing utilities continue to work.                           |

### Running Supabase locally

1. Install Docker and the Supabase CLI.
2. From the project root run:
   ```bash
   supabase start
   ```
3. Update the Supabase environment variables above to match the values printed by the CLI.
4. Apply migrations and seed data:
   ```bash
   supabase db reset --db-url "postgres://postgres:postgres@localhost:54322/postgres"
   ```
   The reset command runs every SQL migration under `supabase/migrations` and then executes seed files inside `supabase/seed` (such as `vocab_rotation.sql`).

## 4. AI provider fields (optional)

Only configure these if you plan to run AI-backed endpoints (sentence evaluation, etc.). Pick one provider and supply the relevant keys.

| Variable                       | Required | Example   | Notes                                                                              |
| ------------------------------ | -------- | --------- | ---------------------------------------------------------------------------------- |
| `GX_AI_PROVIDER`               | Optional | `openai`  | Determines which provider wrapper the app uses (`openai`, `groq`, `gemini`, etc.). |
| `OPENAI_API_KEY`               | Optional | `sk-test` | Needed when `GX_AI_PROVIDER=openai`.                                               |
| `OPENAI_MODEL`                 | Optional | `gpt-4o`  | Default completion model.                                                          |
| `OPENAI_WRITING_MODEL`         | Optional |           | Overrides the model used for writing tasks (leave blank to reuse `OPENAI_MODEL`).  |
| `OPENAI_SPEAKING_MODEL`        | Optional |           | Overrides the model for speaking tasks.                                            |
| `GROQ_API_KEY`                 | Optional |           | Supply when using Groq.                                                            |
| `GROQ_MODEL`                   | Optional |           | Model name for Groq (e.g. `mixtral-8x7b`).                                         |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Optional |           | Provide when using Google Gemini.                                                  |
| `GEMINI_API_KEY`               | Optional |           | Alternate name sometimes used for Gemini keys.                                     |

## 5. Payments (optional)

Only required when testing Stripe integrations.

| Variable                | Required | Example       | Notes                                                                                                       |
| ----------------------- | -------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | Optional | `sk_test_123` | Obtain from Stripe dashboard → Developers → API keys.                                                       |
| `STRIPE_WEBHOOK_SECRET` | Optional | `whsec_test`  | Provided when you register a webhook endpoint. Needed for local webhook testing (e.g. via `stripe listen`). |

## 6. Twilio (optional)

These unlock phone/SMS/WhatsApp verification flows.

| Variable                    | Required | Example                             | Notes                                                       |
| --------------------------- | -------- | ----------------------------------- | ----------------------------------------------------------- |
| `TWILIO_ACCOUNT_SID`        | Optional | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Found under Twilio Console → Account Info.                  |
| `TWILIO_AUTH_TOKEN`         | Optional | `auth_token`                        | Twilio auth token.                                          |
| `TWILIO_VERIFY_SERVICE_SID` | Optional | `VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Create a Verify service in Twilio.                          |
| `TWILIO_WHATSAPP_FROM`      | Optional | `whatsapp:+15551234567`             | Sender address used for WhatsApp messages.                  |
| `TWILIO_BYPASS`             | Optional | `true`                              | When `true`, local code paths can skip Twilio verification. |
| `NEXT_PUBLIC_TWILIO_BYPASS` | Optional | `true`                              | Front-end flag mirroring the bypass toggle.                 |

## 7. Miscellaneous feature flags

| Variable               | Required | Example | Notes                                                                        |
| ---------------------- | -------- | ------- | ---------------------------------------------------------------------------- |
| `LIMIT_FREE_READING`   | Optional | `20`    | Number of free reading attempts before gating.                               |
| `LIMIT_FREE_LISTENING` | Optional | `10`    | Number of free listening attempts.                                           |
| `LIMIT_FREE_SPEAKING`  | Optional | `2`     | Number of free speaking attempts.                                            |
| `SKIP_ENV_VALIDATION`  | Optional | `false` | Set to `true` if you want to bypass strict env validation in preview builds. |

## 8. Verifying your setup

After populating `.env` run the following commands to validate your environment:

```bash
npm run lint
npm run test:phase3 # optional but exercises vitest suite
npm run dev
```

- The dev server should start on [http://localhost:3000](http://localhost:3000).
- API routes that require Supabase will function once the Supabase variables are populated.

## 9. Troubleshooting checklist

1. **Unexpected 401 responses:** confirm Supabase keys are set and that your local session is authenticated.
2. **Database errors when seeding:** ensure migrations ran successfully and that your `SUPABASE_URL` points to the running database.
3. **AI endpoints timing out:** verify the selected provider key is valid and that the provider is whitelisted for your project.
4. **Stripe/Twilio calls failing:** re-check secrets and sandbox credentials; use the respective CLI tooling (`stripe listen`, `twilio serverless:start`) to inspect requests.

With these fields configured you should have a fully functional local environment for developing the Word-of-the-Day features and the wider Gramor_X experience.
