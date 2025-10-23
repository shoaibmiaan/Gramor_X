# Launch checklist

- [ ] Confirm production environment variables are configured (Supabase, Redis, feature flags).
- [ ] Verify default feature flags via `/api/debug/feature-flags` match launch expectations.
- [ ] Run `npm run ci:all` and ensure Lighthouse + Axe budgets pass.
- [ ] Review rate-limit dashboards for `ai:writing:score-v2` and confirm no blocks.
- [ ] Smoke test export and certificate flows for a Booster+ user.
- [ ] Validate retention policies by checking `writing_responses.deleted_at` on soft deletes.
- [ ] Prepare rollback plan and ensure kill switches (`killSwitchWriting`, etc.) are tested.
