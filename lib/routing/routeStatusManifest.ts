export type RouteStatus = 'done' | 'partial' | 'incomplete';

export type RouteStatusEntry = {
  id: string;
  route: string;
  component: string;
  status: RouteStatus;
  summary: string;
  cta?: {
    label: string;
    href: string;
    secondaryLabel?: string;
    secondaryHref?: string;
  };
  lock?: {
    enabled: true;
    reason: string;
  };
};

export const routeStatusManifest: RouteStatusEntry[] = [
  {
    id: 'reading-index',
    route: '/reading',
    component: 'pages/reading/index.tsx',
    status: 'partial',
    summary: 'Primary reading catalog is available, but writing-only mode still renders a coming-soon gate.',
    cta: { label: 'Join waitlist', href: '/waitlist' },
  },
  {
    id: 'writing-index',
    route: '/writing',
    component: 'pages/writing/index.tsx',
    status: 'partial',
    summary: 'Primary writing catalog is available, but reading-only mode still renders a coming-soon gate.',
    cta: { label: 'Join waitlist', href: '/waitlist' },
  },
  {
    id: 'coach-index',
    route: '/coach',
    component: 'pages/coach/index.tsx',
    status: 'incomplete',
    summary: 'Coaching is not launched yet and should stay behind a consistent placeholder shell.',
    cta: {
      label: 'Join waitlist',
      href: '/waitlist',
      secondaryLabel: 'Explore live classes',
      secondaryHref: '/classes',
    },
  },
  {
    id: 'leaderboard-index',
    route: '/leaderboard',
    component: 'pages/leaderboard/index.tsx',
    status: 'done',
    summary: 'Leaderboard is live; seasonal mode copy remains as a minor enhancement item.',
    lock: { enabled: true, reason: 'Stable acquisition and retention surface with active analytics dependencies.' },
  },
  {
    id: 'account-activity',
    route: '/account/activity',
    component: 'pages/account/activity.tsx',
    status: 'done',
    summary: 'Activity page is live; filter panel copy indicates a deferred UX enhancement only.',
    lock: { enabled: true, reason: 'Billing-adjacent activity timeline should not regress without explicit override.' },
  },
  {
    id: 'account-billing-history',
    route: '/account/billing-history',
    component: 'pages/account/billing-history.tsx',
    status: 'done',
    summary: 'Billing history page is production-ready; load-more subfeature is deferred.',
    lock: { enabled: true, reason: 'Finance-visible reporting surface requires ownership for edits.' },
  },
  {
    id: 'settings-security',
    route: '/settings/security',
    component: 'pages/settings/security.tsx',
    status: 'done',
    summary: 'Security settings are usable; MFA management action is still planned.',
    lock: { enabled: true, reason: 'Security surfaces need explicit review and controlled rollout edits.' },
  },
  {
    id: 'dashboard-activity',
    route: '/dashboard/activity',
    component: 'pages/dashboard/activity/index.tsx',
    status: 'done',
    summary: 'Dashboard activity page is functional; chart module has coming-soon copy fallback.',
    lock: { enabled: true, reason: 'Core dashboard route with high user traffic and shared metrics wiring.' },
  },
];

export const incompleteRouteSet = new Set(
  routeStatusManifest.filter((entry) => entry.status === 'incomplete').map((entry) => entry.route),
);

export const doneLockedComponents = routeStatusManifest
  .filter((entry) => entry.status === 'done' && entry.lock?.enabled)
  .map((entry) => entry.component);
