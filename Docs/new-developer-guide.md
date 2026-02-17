# New Developer Onboarding Guide

This guide walks a new contributor through setting up a fresh copy of the Gramor_X repository and running it locally.

## 1. Clone the repository

```bash
git clone https://github.com/your-org/GramorX_Clean.git
cd GramorX_Clean
```

> If you already have a clone, run `git pull origin main` to refresh it before working on a task.

## 2. Install prerequisites

- **Node.js 20+** and **npm 10+** (matching the `engines` field).
- **Git** for source control.
- Optional: **Docker** if you want to run the Postgres container described in `LOCAL_DB_SETUP.md`.

Check versions:

```bash
node -v
npm -v
```

## 3. Install dependencies

From the project root, install JavaScript dependencies:

```bash
npm install
```

## 4. Configure environment variables

1. Copy the example file and adjust values as needed:
   ```bash
   cp .env.example .env
   ```
2. Set `SITE_URL`, `NEXT_PUBLIC_SITE_URL`, and any providers you intend to use (Supabase, Stripe, Twilio, or AI keys).
3. If you are not using a provider locally, keep the placeholder values from `.env.example` to avoid runtime errors.

## 5. Run the app in development

Start the Next.js dev server and the premium Tailwind watcher:

```bash
npm run dev
```

- The app serves on `http://localhost:3000` by default.
- `npm run dev` also watches and rebuilds the premium Tailwind bundle defined in `tailwind.config.premium.js`.

## 6. Optional: database setup

If your work touches Supabase/Postgres data, start a local database using the instructions in `LOCAL_DB_SETUP.md`. The quick steps are:

1. Run the provided Postgres 15 Docker container with the `gramorx` user and `gramorx-db` database (see commands in `LOCAL_DB_SETUP.md`).
2. Update your `.env` with the matching `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` values.
3. Run migrations from `supabase/migrations/` as needed for your feature work.

## 7. Validate your changes

Common checks before opening a PR:

- **Lint**: `npm run lint`
- **Unit / integration tests**: `npm run test` (Twilio calls are bypassed automatically in this script)
- **Format check** (optional): `npm run format:check`

If you touch Storybook components, you can preview them with `npm run storybook`.

## 8. Build for production (optional)

To verify production readiness:

```bash
npm run build
npm start
```

`npm run build` also generates the premium CSS bundle and runs route generation scripts, matching the production flow.

## 9. Keep your branch up to date

While developing, periodically sync with `main` to reduce merge conflicts:

```bash
git fetch origin
git rebase origin/main
```

If the rebase introduces conflicts, resolve them locally, run the checks in step 7, and continue the rebase with `git rebase --continue`.

## 10. Ready to contribute

When your changes pass local checks, commit them with a clear message and open a PR. Include a summary of the feature, how to test it, and any environment variables required.
