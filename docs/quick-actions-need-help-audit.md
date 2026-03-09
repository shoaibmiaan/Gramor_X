# Quick Actions + Need Help Audit & Refactor Plan

## Scope and method
- Repository-wide text scan for case-insensitive variants of `quick action(s)` and `need help` across components, pages, layouts, and emails.
- Command used:
  - `rg -n --hidden -i --glob '!node_modules' --glob '!.next' --glob '!dist' "quick actions?|need help\??" .`
- Follow-up file inspection was used to classify each hit as:
  - **Direct UI instance** (heading/button/link/card shown to users),
  - **Wrapper/context instance** (container or parent page wiring),
  - **Non-target copy/comment** (not part of the requested UI standardization).

---

## 1) Inventory: “Quick Actions” occurrences

### A. Core reusable components (highest refactor priority)
1. `components/activity/QuickActions.tsx:71` — card heading “Quick Actions”; multi-action grid + CTA buttons.
2. `components/dashboard/QuickActions.tsx:16` — dashboard card titled “Quick actions” with responsive action tiles.
3. `components/dashboard/sections/QuickActionsSection.tsx:20` — section heading “Quick actions” + wrap of multiple buttons.
4. `components/navigation/QuickAccessWidget.tsx:53` — floating quick-actions menu label.

### B. Page-level implementations (likely consumers of unified component)
5. `pages/learning/skills/[skill].tsx:149` — “Quick Actions” heading and action links.
6. `pages/profile/account/index.tsx:450` — “Quick actions” subsection in account activity card.
7. `pages/account/index.tsx:438` — translated “Quick actions” subsection in account activity card.
8. `pages/data-deletion.tsx:90` — “2) Quick Actions” section with support/privacy CTAs.

### C. Wrapper/related references (not a direct standalone component)
9. `pages/dashboard/activity/index.tsx:469` — page column comment and inclusion of activity quick-actions component.
10. `components/layouts/ResourcesLayout.tsx:52` — comment label “Quick actions”; UI text is “Quick Access.”
11. `pages/mock/writing/index.tsx:250` — comment only (`/* QUICK ACTIONS */`).
12. `pages/mock/listening/index.tsx:25` and `:249` — comment/static marker only.
13. `pages/mock/reading/review/[attemptId].tsx:387` — comment only.
14. `pages/data-deletion.tsx:11` — TOC title string “Quick Actions” (navigation label).

---

## 2) Inventory: “Need Help?” occurrences

### A. Interactive product UI (highest refactor priority)
1. `components/writing/RightRailCoach.tsx:79` — ghost button `Need help?`.
2. `components/auth/AuthAssistant.tsx:236` — floating launcher button `Need help?`.
3. `pages/onboarding/welcome/index.tsx:505` — help CTA card heading `Need help?` with two support actions.
4. `pages/checkout/index.tsx:520` — checkout footer support link `Need help?`.
5. `pages/checkout/crypto.tsx:189` — support link `Need help? Contact support`.
6. `pages/teacher/pending.tsx:28` — info alert `Need help? Contact support...`.
7. `pages/teacher/Welcome.tsx:236` — help copy in FAQ tab linking support center.
8. `components/premium/UpgradeModal.tsx:178` — modal support copy with email CTA.

### B. Contextual “Need help…” variants (same intent, not always exact label)
9. `components/auth/AuthAssistant.tsx:49`, `:61`, `:73` — seeded assistant prompts “Need help signing in/creating account/...”.
10. `pages/challenge/[cohort].tsx:170` — in-line motivational help tip.
11. `pages/data-deletion.tsx:196` — support appeal copy “Need help, or want to appeal...”.
12. `pages/account/subscription.tsx:401` — i18n/help copy string for subscription support.

### C. Email templates (shared language, separate UI system)
13. `emails/PaymentFailedEmail.tsx:37` — `Need help? Contact support` line.
14. `emails/SignupEmail.tsx:31` — `Need help? Contact our support team` line.

### D. Non-target language (exclude from component migration)
15. `data/roleplay/scenarios.ts:39` — sample sentence “Do you need help...”; not product UI.

---

## 3) Pattern analysis (what to keep vs. what to fix)

## Strong patterns worth reusing
- **Tile-style quick action cards with compact hierarchy** from `components/dashboard/QuickActions.tsx`:
  - clear title/description split,
  - hover/focus affordance,
  - responsive grid from 1 → 2 → 3 columns.
- **Touch-friendly floating affordance** from `components/navigation/QuickAccessWidget.tsx`:
  - mobile-first fixed bottom positioning,
  - larger tap targets,
  - explicit open/close states and `aria-controls`.
- **Action density with wrapped buttons** from `components/dashboard/sections/QuickActionsSection.tsx`:
  - supports many actions without overflow,
  - easy to compose with existing Button variants.
- **Simple, prominent support CTA language** from onboarding/checkout flows:
  - short “Need help?” heading,
  - direct action labels (“Contact support”, “Open AI assistant”).

## Inconsistencies to eliminate
- **Naming drift**: “Quick Actions”, “Quick actions”, “Quick Access”, “Quick Access widget”.
- **CTA style drift**: support appears as ghost button, text link, alert text, modal paragraph, or floating launcher.
- **Token drift**: mixed Tailwind palette usage (`slate-*`, `gray-*`, custom tokens) and mixed border radius scales.
- **Spacing drift**: vertical rhythm varies (`p-3`, `p-4`, `p-5`, `p-6`) with no component-level contract.
- **A11y gaps**:
  - not all support CTAs carry explicit `aria-label` when context could be ambiguous,
  - keyboard focus style consistency is uneven,
  - some CTA links are low-emphasis in dense footer text.

---

## 4) Unification recommendation

Create **one shared component**:

## `ActionSupportPanel` (single source of truth)
A composable, responsive panel that includes:
1. **Quick Actions zone** (icon + label + optional description for each action).
2. **Need Help zone** (single prominent support CTA + optional secondary CTA).

This component should replace most direct implementations above, with context-specific wrappers only when needed.

---

## 5) Deprecation / merge plan

## Migrate into `ActionSupportPanel` (directly)
- `components/activity/QuickActions.tsx`
- `components/dashboard/QuickActions.tsx`
- `components/dashboard/sections/QuickActionsSection.tsx`
- `pages/learning/skills/[skill].tsx` quick-actions block
- `pages/profile/account/index.tsx` quick-actions subsection
- `pages/account/index.tsx` quick-actions subsection
- Need-help blocks in:
  - `components/writing/RightRailCoach.tsx`
  - `pages/onboarding/welcome/index.tsx`
  - `pages/checkout/index.tsx`
  - `pages/checkout/crypto.tsx`
  - `pages/teacher/pending.tsx`
  - `pages/teacher/Welcome.tsx`
  - `components/premium/UpgradeModal.tsx`

## Keep as specialized wrappers, but back them with shared primitives
- `components/navigation/QuickAccessWidget.tsx` (floating behavior is unique).
- `components/auth/AuthAssistant.tsx` (chat launcher/assistant UX is unique).
- Email templates (`emails/*`) should reuse copy conventions, not web UI component code.

## Do not migrate (out of scope)
- Comment-only markers and non-UI text occurrences.

---

## 6) Best-in-class component blueprint (pseudo-code)

```txt
Component: ActionSupportPanel

Props:
- title?: string = "Quick actions"
- subtitle?: string
- actions: Array<{
    id: string
    label: string
    href?: string
    onClick?: () => void
    icon?: ReactNode
    description?: string
    badge?: string
    disabled?: boolean
    analyticsId?: string
  }>
- support: {
    label?: string = "Need help?"
    description?: string
    primaryCta: {
      label: string
      href?: string
      onClick?: () => void
      icon?: ReactNode
    }
    secondaryCta?: {
      label: string
      href?: string
      onClick?: () => void
    }
  }
- layout?: "stack" | "split" | "floating"
- density?: "comfortable" | "compact"
- maxActionsVisible?: number
- className?: string
- actionClassName?: string
- supportClassName?: string

Rendering rules:
1) Outer container
   - semantic <section aria-labelledby>
   - tokenized surface: rounded, border, background, shadow
   - spacing scale via density tokens

2) Header
   - title + optional subtitle
   - optional trailing slot (e.g., "View all")

3) Actions grid
   - mobile: 1 column, min tap target 44px height
   - >=sm: 2 columns
   - >=lg: 3 columns (or configured)
   - each item: icon | text stack | trailing affordance
   - focus ring always visible on keyboard focus
   - disabled items use aria-disabled + muted tokens

4) Support block
   - visually separated (top border or tinted inset panel)
   - heading "Need help?" + short helper copy
   - primary CTA button full-width on mobile, auto-width on >=sm
   - optional secondary CTA as text/ghost button

5) Accessibility
   - action buttons/links get explicit labels if text is ambiguous
   - support CTA uses `aria-label="Contact support"` (or context label)
   - color contrast AA minimum
   - keyboard order: header -> actions -> support CTA(s)

6) Responsive behavior
   - stack layout default mobile-first
   - split layout on large screens (actions left, support right)
   - floating variant allowed only in wrapper with motion/reduced-motion guard

7) Theming/design tokens
   - rely on design-system tokens (`bg-card`, `border-border`, `text-muted-foreground`, radius tokens)
   - avoid raw palette one-offs unless tokenized alias exists

8) Telemetry hooks
   - emit action click events with `analyticsId`
   - emit support CTA click event with context (page + variant)
```

---

## 7) Suggested rollout sequence
1. Build `ActionSupportPanel` in `components/shared` with Storybook/visual states (if available).
2. Migrate dashboard/activity/account implementations first (highest duplication).
3. Migrate onboarding/checkout/teacher help CTAs to shared support block variant.
4. Keep auth assistant + floating widget as wrappers around shared action item/support CTA primitives.
5. Standardize copy casing to:
   - Heading: **Quick actions**
   - Support heading: **Need help?**
6. Add regression checks:
   - keyboard tab/focus order,
   - mobile viewport tap targets,
   - dark mode contrast.

---

## 8) Definition of done for refactor
- One canonical component used by all web app “Quick actions + Need help” blocks except explicitly specialized wrappers.
- Legacy duplicated sections removed.
- Copy and casing consistent across migrated screens.
- All migrated instances meet accessibility and responsive acceptance criteria.
