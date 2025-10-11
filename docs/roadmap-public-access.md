# Public Roadmap Accessibility

The public roadmap page is intended to be reachable by unauthenticated visitors. To ensure this, `/roadmap` is included in the public route allowlist alongside other marketing surfaces. The matcher-based allowlist supports trailing slashes and nested paths, so variants like `/roadmap/` or `/roadmap?utm=campaign` stay public.

Client-side route guarding reuses the shared matcher logic rather than relying on bespoke checks. This keeps behavior consistent across marketing pages and reduces the risk of regressions when adding new routes.
