# Interaction & Behavior Audit (Phase 12.1.3)

## Audit method

- Pattern search across `components/` and `pages/` for:
  - Hover/focus selectors
  - Transition utilities
  - Loading indicators (`animate-spin`, `animate-pulse`, `loading` props)
- Manual review of navigation, button, modal, and dashboard components

## Findings

## 1) Hover/focus patterns are mixed across primitives

Examples:
- Strong focus-visible ring usage exists in many components (good baseline).
- Some controls still use custom/legacy focus patterns (`focus:outline-none` + ad-hoc ring styles), e.g. playground and reading question inputs.

**Impact:** Keyboard focus affordances are generally present but not consistently tokenized.

## 2) Loading behavior is inconsistent (spinner vs skeleton)

Signal counts from grep-style scan:
- `animate-spin`: 10 matches
- `animate-pulse`: 105 matches
- broad `loading` usage: widespread across feature modules

**Impact:** Users get mixed perceived-performance cues; some list/card surfaces still use spinners where shape-preserving skeletons would be better.

## 3) Navigation interactions are relatively polished but not yet unified

- `components/navigation/MobileNav.tsx` has richer transitions and interaction states.
- Other nav areas still rely on simpler hover/active treatments.

**Impact:** Interaction quality differs between mobile and desktop contexts.

## 4) Button-level interaction duplication

- Multiple direct `<button>` implementations with local classnames are used instead of a shared primitive in many feature modules.

**Impact:** Hover/focus/disabled/loading behavior diverges over time.

## Priority fixes for Phase 12

1. Create/lock a single button interaction contract (hover, focus-visible, disabled, loading).
2. Standardize loading by surface type:
   - skeletons for cards/lists/tables
   - spinners only for isolated inline actions.
3. Add an interaction checklist to PR template for new UI controls.

