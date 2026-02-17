#!/usr/bin/env bash
set -euo pipefail
echo "CI container started: $(date)"
CI_ENV="${CI_ENV:-staging}"
echo "CI_ENV=$CI_ENV"

node -v
supabase --version

if [ -f package.json ]; then
  echo "-> lint"
  npm run -s lint || { echo "lint failed"; exit 1; }
  echo "-> tests"
  npm test --silent || { echo "tests failed"; exit 1; }
fi

if [ -n "${SUPABASE_PROJECT_REF:-}" ]; then
  echo "Linking supabase project ref: $SUPABASE_PROJECT_REF"
  supabase link --project-ref "$SUPABASE_PROJECT_REF" || true
fi

if [ -n "${SUPABASE_DB_URL:-}" ]; then
  echo "Applying database migrations"
  supabase db push --db-url "$SUPABASE_DB_URL"
else
  if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ] && [ -n "${SUPABASE_PROJECT_REF:-}" ]; then
    echo "Using supabase db push with linked project"
    export SUPABASE_ACCESS_TOKEN
    supabase db push --project-ref "$SUPABASE_PROJECT_REF"
  else
    echo "ERROR: No SUPABASE_DB_URL and no SUPABASE_ACCESS_TOKEN+SUPABASE_PROJECT_REF"
    exit 2
  fi
fi

if [ -d "functions" ]; then
  echo "Deploying functions..."
  if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
    echo "WARNING: SUPABASE_ACCESS_TOKEN missing; skipping functions deploy"
  else
    export SUPABASE_ACCESS_TOKEN
    for fn in functions/*; do
      if [ -d "$fn" ]; then
        echo "-> Deploying $(basename "$fn")"
        supabase functions deploy "$(basename "$fn")" --no-verify || { echo "Function deploy failed"; exit 3; }
      fi
    done
  fi
fi

echo "CI container finished successfully: $(date)"
