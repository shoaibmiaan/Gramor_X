# Maintenance Notes

## Installation blockers

- Previous status: `npm install` failed because the transitive dependency `chromedriver` attempted to download binaries from `https://googlechromelabs.github.io`, which returned HTTP 403 "Domain forbidden" in locked-down environments. The failure originated from the `@axe-core/cli` dev dependency, which has a hard dependency on `chromedriver`.【f53222†L1-L106】
- Resolution: `.npmrc` now sets `chromedriver_skip_download=true`, which skips the binary download during installation so environments without external network access (e.g., Supabase build containers) can complete `npm install`. If you need the CLI locally, export `CHROMEDRIVER_SKIP_DOWNLOAD=false` before installing or manually install ChromeDriver.
- Long-term follow-up: consider replacing the CLI with a Playwright-only workflow so `chromedriver` is no longer required.

## Build blockers

- Supabase and other restricted environments cannot reach the Next.js lockfile patch registry URLs, causing `next build` to exit with `fetch failed` while "patching" SWC dependencies. The build script now invokes Next.js through `scripts/next-build.mjs`, which sets `NEXT_DISABLE_LOCKFILE_PATCH=1` unless the variable is already provided, preventing the network call. Override the variable locally if you want Next.js to patch the lockfile.

## Deprecated dependencies

- Replaced the deprecated `@supabase/auth-helpers-*` packages with `@supabase/ssr` across API routes and SSR paths.【858707†L43-L135】
- Multiple transitive dependencies emit deprecation warnings during install (`glob`, `rimraf`, `rollup-plugin-terser`, etc.). Audit and upgrade the packages that pull in these versions to keep the toolchain current.【f404f4†L1-L12】【e76e09†L1-L13】

## Engine configuration mismatch

- `npm` 11.x satisfies the specified Node range (>=20 <21) but falls outside the declared npm range (>=10 <11). Consider relaxing the `npm` engine requirement so installs on the latest Node 20 LTS + npm 11 toolchains do not emit EBADENGINE warnings.【3c0b21†L1-L5】【858707†L136-L139】
