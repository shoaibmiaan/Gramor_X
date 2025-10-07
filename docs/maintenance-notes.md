# Maintenance Notes

## Installation blockers
- Running `npm install` currently fails because the transitive dependency `chromedriver` attempts to download binaries from `https://googlechromelabs.github.io`. The request returns HTTP 403 "Domain forbidden", which prevents the dependency tree from completing installation. The failure originates from the `@axe-core/cli` dev dependency, which has a hard dependency on `chromedriver`.【f53222†L1-L106】
- Workaround: execute the install in an environment that can reach `googlechromelabs.github.io` or temporarily remove the `@axe-core/cli` dependency. Long term, consider replacing the CLI with a Playwright-only workflow so `chromedriver` is no longer required.

## Deprecated dependencies
- `@supabase/auth-helpers-nextjs` and `@supabase/auth-helpers-shared` are deprecated in favor of `@supabase/ssr`. Plan to migrate to the new package to avoid depending on unsupported helpers.【858707†L43-L135】
- Multiple transitive dependencies emit deprecation warnings during install (`glob`, `rimraf`, `rollup-plugin-terser`, etc.). Audit and upgrade the packages that pull in these versions to keep the toolchain current.【f404f4†L1-L12】【e76e09†L1-L13】

## Engine configuration mismatch
- `npm` 11.x satisfies the specified Node range (>=20 <21) but falls outside the declared npm range (>=10 <11). Consider relaxing the `npm` engine requirement so installs on the latest Node 20 LTS + npm 11 toolchains do not emit EBADENGINE warnings.【3c0b21†L1-L5】【858707†L136-L139】
