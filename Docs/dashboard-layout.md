# Dashboard Layout Usage

Use `DashboardLayout` for all `/dashboard/*` pages and dashboard tier views.

## Why

`DashboardLayout` centralizes:

- Desktop sidebar rendering and collapse state.
- Sticky top header actions.
- Mobile navigation toggle + link panel.
- Shared spacing (`p-4 md:p-8`) and shell container behavior.

## Usage pattern

```tsx
import { DashboardLayout } from '@/components/layouts/DashboardLayout';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <section className="space-y-6">{/* page content */}</section>
    </DashboardLayout>
  );
}
```

## Rules

1. Do not re-implement sidebar/header wrappers in individual dashboard pages.
2. Keep page-level layout concerns inside `DashboardLayout`.
3. Keep route-specific content inside page components only.
4. If dashboard nav changes, update `DASHBOARD_NAV_ITEMS` in `components/dashboard/Sidebar.tsx`.
