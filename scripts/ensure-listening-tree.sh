ensure-listening-tree.shensure-listening-tree.sh#!/usr/bin/env bash
set -euo pipefail

WITH_OPTIONAL=0
if [[ "${1:-}" == "--with-optional" ]]; then WITH_OPTIONAL=1; fi

root_check() {
  if [[ ! -f "package.json" || ! -d "pages" ]]; then
    echo "Run this from your Next.js project root (where package.json exists)." >&2
    exit 1
  fi
}
root_check

FILES_ALWAYS=(
  # Pages
  "pages/analytics/listening.tsx"
  "pages/analytics/listening/trajectory.tsx"
  "pages/learn/listening/tips.tsx"
  "pages/learn/listening/mistakes.tsx"
  "pages/learn/listening/coach.tsx"
  "pages/me/listening/saved.tsx"
  "pages/mock/listening/index.tsx"
  # start.tsx is UPDATED in repo; we won't touch it
  "pages/mock/listening/run.tsx"
  "pages/mock/listening/result.tsx"
  "pages/practice/listening/daily.tsx"
  "pages/tools/listening/dictation.tsx"
  "pages/tools/listening/accent-trainer.tsx"

  # API
  "pages/api/admin/listening/tips.moderate.ts"
  "pages/api/ai/listening/coach.ts"
  "pages/api/ai/listening/dictation.grade.ts"
  "pages/api/ai/listening/accent.check.ts"
  "pages/api/dev/seed/listening-one.ts"
  "pages/api/listening/mini/grade.ts"
  "pages/api/listening/attempts/log.ts"
  "pages/api/listening/practice/toggle.ts"
  "pages/api/listening/tips/submit.ts"
  "pages/api/listening/mistakes/review.ts"
  "pages/api/listening/save.ts"
  "pages/api/listening/attempts/export.csv.ts"
  "pages/api/mock/listening/create-run.ts"
  "pages/api/mock/listening/play-ping.ts"
  "pages/api/mock/listening/save-answers.ts"
  "pages/api/mock/listening/submit-final.ts"

  # Components
  "components/listening/SaveButton.tsx"
  "components/listening/analytics/DrillBreakdown.tsx"
  "components/listening/dictation/DictationEditor.tsx"
  "components/listening/players/AccentSwitcher.tsx"
  "components/listening/quizzes/TimedMiniTest.tsx"
  "components/listening/accent/AccentClip.tsx"

  # Lib
  "lib/listening/accentMap.ts"
  "lib/listening/errors.ts"
  "lib/listening/insights.ts"
  "lib/ai/listening/dictationAdapter.ts"
  "lib/validators/listening.ts"

  # Supabase migrations
  "supabase/migrations/20251111_listening_metrics.sql"
  "supabase/migrations/20251111_listening_practice.sql"
  "supabase/migrations/20251111_listening_tips.sql"
  "supabase/migrations/20251111_listening_mistake_reviews.sql"
  "supabase/migrations/20251111_listening_saved_resources.sql"
  "supabase/migrations/20251111_seed_listening_sample.sql"
  "supabase/migrations/20251112_listening_mock_v1.sql"

  # Public
  "public/manifest.webmanifest"
  "public/sw.js"
  "public/samples/listening/.gitkeep"
  "public/samples/listening/README.txt"
)

FILES_OPTIONAL=(
  # Optional Phase 5.1 (Review & Drill add-on)
  "pages/mock/listening/review.tsx"
  "pages/learn/listening/drill/from-run.tsx"
  "pages/api/mock/listening/run.detail.ts"
  "pages/api/listening/drill/submit.ts"
  "components/media/ClipPlayer.tsx"
  "supabase/migrations/20251112_mock_demo_explain_clips.sql"
)

write_placeholder() {
  local f="$1"
  local ext="${f##*.}"
  # Guard directories
  mkdir -p "$(dirname "$f")"

  if [[ -e "$f" ]]; then
    echo "✅ Found: $f"
    return
  fi

  case "$ext" in
    tsx)
      # Pages/components placeholder (no DS imports to avoid build coupling)
      if [[ "$f" == pages/api/* ]]; then
        : # won't happen (api is .ts), but keep for clarity
      elif [[ "$f" == pages/* ]]; then
cat >"$f"<<'TSX'
// Auto-generated placeholder page — replace with real implementation.
export default function Page(){ return <main />; }
TSX
      else
cat >"$f"<<'TSX'
// Auto-generated placeholder component — replace with real implementation.
export default function Placeholder(){ return null; }
TSX
      fi
      ;;
    ts)
      if [[ "$f" == pages/api/* ]]; then
cat >"$f"<<'TS'
// Auto-generated placeholder API — replace with real implementation.
import type { NextApiRequest, NextApiResponse } from 'next';
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(501).json({ error: 'Not implemented' });
}
TS
      else
cat >"$f"<<'TS'
// Auto-generated placeholder module — replace with real implementation.
export {};
TS
      fi
      ;;
    sql)
cat >"$f"<<'SQL'
-- Auto-generated placeholder migration — replace with real SQL from the spec.
-- Keep filename to preserve ordering.
SQL
      ;;
    json|webmanifest)
cat >"$f"<<'JSON'
{
  "name": "GramorX",
  "short_name": "GramorX",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": []
}
JSON
      ;;
    js)
cat >"$f"<<'JS'
// Minimal service worker placeholder — replace with the real sw.js from the spec.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
JS
      ;;
    txt|gitkeep)
      : > "$f"
      if [[ "$f" == "public/samples/listening/README.txt" ]]; then
cat >"$f"<<'TXT'
Place your sample .mp3 audio assets in this folder.
Update paper JSON to point to the correct relative paths.
TXT
      fi
      ;;
    *)
      : > "$f"
      ;;
  esac

  echo "🆕 Created: $f"
}

echo "=== Ensuring core files (Phases 1–5) exist ==="
for f in "${FILES_ALWAYS[@]}"; do
  write_placeholder "$f"
done

if [[ $WITH_OPTIONAL -eq 1 ]]; then
  echo "=== Ensuring optional Phase 5.1 files exist ==="
  for f in "${FILES_OPTIONAL[@]}"; do
    write_placeholder "$f"
  done
else
  echo "Tip: run with --with-optional to also create Review/Drill add-on files."
fi

echo "=== Done. Summary ==="
CREATED=$(git ls-files --others --exclude-standard | wc -l | tr -d ' ')
echo "New (untracked) files: $CREATED (use 'git add -A' to stage)"
