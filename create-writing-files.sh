#!/usr/bin/env bash
set -euo pipefail

FILES=(
  data/writing/tips.ts
  data/writing/micro.ts
  pages/writing/resources.tsx
  pages/writing/learn/task1-overview.tsx
  pages/writing/learn/task2-structure.tsx
  pages/writing/learn/coherence.tsx
  supabase/migrations/20251110_writing_activity_log.sql
  pages/api/writing/log-complete.ts
  lib/ai/writing/insightsAdapter.ts
  pages/api/ai/writing/insights.ts
  lib/analytics/events.ts
  pages/api/admin/writing-activity.ts
  pages/admin/reports/writing-activity.tsx
  supabase/migrations/20251110_ai_writing_insights_quota.sql
  lib/usage/bypass.ts
)

for f in "${FILES[@]}"; do
  if [[ -f "$f" ]]; then
    echo "✅ Found: $f"
  else
    mkdir -p "$(dirname "$f")"
    : > "$f"
    echo "🆕 Created: $f"
  fi
done

