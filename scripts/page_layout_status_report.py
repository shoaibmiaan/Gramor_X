#!/usr/bin/env python3
from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES_DIR = ROOT / 'pages'
OUT_FILE = ROOT / 'docs' / 'page-layout-status.md'

ROUTE_LAYOUT_MAP: dict[str, tuple[str, bool]] = {
    '/': ('marketing', True),
    '/auth/callback': ('auth', False),
    '/auth/forgot': ('auth', False),
    '/auth/login': ('auth', False),
    '/auth/mfa': ('auth', False),
    '/auth/reset': ('auth', False),
    '/auth/signup': ('auth', False),
    '/forgot-password': ('auth', False),
    '/update-password': ('auth', False),
    '/login': ('auth', False),
    '/login/email': ('auth', False),
    '/login/password': ('auth', False),
    '/login/phone': ('auth', False),
    '/signup': ('auth', False),
    '/signup/email': ('auth', False),
    '/signup/password': ('auth', False),
    '/signup/phone': ('auth', False),
    '/signup/verify': ('auth', False),
    '/proctoring/check': ('proctoring', False),
    '/proctoring/exam/[id]': ('proctoring', False),
    '/premium': ('marketplace', False),
    '/premium/PremiumExamPage': ('marketplace', False),
    '/premium/pin': ('marketplace', False),
    '/premium/listening/[slug]': ('marketplace', False),
    '/premium/reading/[slug]': ('marketplace', False),
    '/403': ('marketing', True),
    '/404': ('marketing', True),
    '/500': ('marketing', True),
    '/pwa/app': ('marketing', False),
}

ROUTE_MATCHERS: list[tuple[re.Pattern[str], tuple[str, bool]]] = [
    (re.compile(r'^/admin(/|$)'), ('admin', True)),
    (re.compile(r'^(?:/institutions(/|$)|/orgs$)'), ('institutions', True)),
    (re.compile(r'^/teacher(/|$)'), ('dashboard', True)),
    (re.compile(r'^(?:/reports(/|$)|/analytics(/|$))'), ('reports', True)),
    (re.compile(r'^(?:/marketplace(/|$)|/checkout(/|$)|/pricing(/|$)|/promotions$|/waitlist$)'), ('marketplace', True)),
    (re.compile(r'^/community(/|$)'), ('community', True)),
    (re.compile(r'^(?:/profile(/|$)|/settings(/|$)|/saved$|/mistakes$|/roadmap$|/me/listening/saved$)'), ('profile', True)),
    (re.compile(r'^/mock/reading/\[slug\](/|$)'), ('dashboard', False)),
    (re.compile(r'^/mock/reading/(result|review|feedback)(/|$)'), ('dashboard', False)),
    (re.compile(r'^/mock/listening/(\[slug\]|exam|result|review)(/|$)'), ('dashboard', False)),
    (re.compile(r'^/mock/writing/(run|result)(/|$)'), ('dashboard', False)),
    (re.compile(r'^/mock/\[section\]$'), ('dashboard', False)),
    (re.compile(r'^/writing/mock/\[mockId\]/(start|workspace|review|results|evaluating)$'), ('dashboard', False)),
    (re.compile(r'^/exam/\[id\]$'), ('dashboard', False)),
    (re.compile(r'^/placement/run$'), ('dashboard', False)),
    (re.compile(r'^(?:/dashboard(/|$)|/mock(/|$)|/practice(/|$)|/study-plan(/|$)|/progress(/|$)|/quick(/|$)|/challenge(/|$)|/coach(/|$)|/onboarding(/|$)|/placement(/|$)|/predictor(/|$)|/notifications$|/leaderboard$|/score$|/exam-day$|/whatsapp-tasks$|/tokens-test$|/restricted$|/exam/rehearsal$)'), ('dashboard', True)),
    (re.compile(r'^(?:/learn(/|$)|/learning(/|$)|/reading(/|$)|/listening(/|$)|/writing(/|$)|/speaking(/|$)|/vocabulary(/|$)|/review(/|$)|/tools(/|$)|/cert(/|$)|/classes(/|$)|/bookings(/|$)|/content/studio(/|$)|/internal/content(/|$)|/vocab$|/word-of-the-day$|/ai(/|$)|/labs/ai-tutor$)'), ('learning', True)),
    (re.compile(r'^(?:/accessibility$|/blog(/|$)|/data-deletion$|/developers$|/faq$|/legal(/|$)|/partners$|/r/\[code\]$|/visa$|/welcome$)'), ('marketing', True)),
]

IN_PROGRESS_RE = re.compile(r'(TODO|TBD|WIP|placeholder|stub|not implemented|mock data|dummy)', re.IGNORECASE)
NOT_STARTED_RE = re.compile(r'(coming soon|under construction|not started|start here)', re.IGNORECASE)


def page_route_from_file(path: Path) -> str:
    rel = path.relative_to(PAGES_DIR)
    route = '/' + str(rel).replace('\\', '/')
    route = re.sub(r'/index\.(tsx|ts|jsx|js)$', '/', route)
    route = re.sub(r'\.(tsx|ts|jsx|js)$', '', route)
    if route != '/' and route.endswith('/'):
        route = route[:-1]
    return route


def get_route_config(route: str) -> tuple[str, bool]:
    if route in ROUTE_LAYOUT_MAP:
        return ROUTE_LAYOUT_MAP[route]

    for pattern, config in ROUTE_LAYOUT_MAP.items():
        if '[' not in pattern:
            continue
        regex_pattern = '^' + re.sub(r'\[([^\]]+)\]', r'([^/]+)', pattern).replace('/', '\\/') + '$'
        if re.match(regex_pattern, route):
            return config

    for pattern, config in ROUTE_MATCHERS:
        if pattern.search(route):
            return config

    return ('marketing', True)


def infer_status(file_contents: str) -> str:
    if NOT_STARTED_RE.search(file_contents):
        return 'Not Started'
    if IN_PROGRESS_RE.search(file_contents):
        return 'In Progress'
    return 'Done'


def status_badge(status: str) -> str:
    return {
        'Done': '✅ Done',
        'In Progress': '🟡 In Progress',
        'Not Started': '⚪ Not Started',
    }[status]


def main() -> None:
    candidate_files = sorted(
        p
        for p in PAGES_DIR.rglob('*')
        if p.is_file()
        and p.suffix in {'.tsx', '.ts', '.jsx', '.js'}
        and p.name not in {'_app.tsx', '_document.tsx', '_error.tsx'}
        and 'api' not in p.relative_to(PAGES_DIR).parts
        and not any(part in {'components', 'hooks', '__tests__', '__mocks__'} for part in p.relative_to(PAGES_DIR).parts)
    )

    page_files: list[Path] = []
    default_export_re = re.compile(r'export\s+default\s+', re.MULTILINE)
    for candidate in candidate_files:
        content = candidate.read_text(encoding='utf-8', errors='ignore')
        if default_export_re.search(content):
            page_files.append(candidate)

    groups: dict[str, list[tuple[str, str, str]]] = defaultdict(list)

    for page_file in page_files:
        route = page_route_from_file(page_file)
        layout, _ = get_route_config(route)
        status = infer_status(page_file.read_text(encoding='utf-8', errors='ignore'))
        groups[layout].append((route, status, str(page_file.relative_to(ROOT))))

    lines: list[str] = []
    lines.append('# Page Inventory by Layout')
    lines.append('')
    lines.append('Auto-generated from `pages/**` and grouped using route layout rules from `lib/routes/routeLayoutMap.ts`.')
    lines.append('')
    lines.append('> Status is inferred automatically from file content markers (e.g., TODO/WIP/coming soon).')
    lines.append('')

    for layout in sorted(groups.keys()):
        pages = sorted(groups[layout], key=lambda x: x[0])
        done = sum(1 for _, s, _ in pages if s == 'Done')
        progress = sum(1 for _, s, _ in pages if s == 'In Progress')
        not_started = sum(1 for _, s, _ in pages if s == 'Not Started')

        lines.append(f'## {layout.title()} Layout')
        lines.append('')
        lines.append(f'- Total pages: **{len(pages)}**')
        lines.append(f'- ✅ Done: **{done}** · 🟡 In Progress: **{progress}** · ⚪ Not Started: **{not_started}**')
        lines.append('')
        lines.append('| Route | Status | Source File |')
        lines.append('|---|---|---|')
        for route, status, src in pages:
            lines.append(f'| `{route}` | {status_badge(status)} | `{src}` |')
        lines.append('')

    OUT_FILE.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'Wrote {OUT_FILE.relative_to(ROOT)} with {len(page_files)} pages.')


if __name__ == '__main__':
    main()
