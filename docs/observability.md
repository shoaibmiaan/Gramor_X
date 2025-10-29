# Observability guide

## Logs

- All API handlers create structured logs via `lib/obs/logger`. Search for correlation IDs emitted via `x-request-id` headers.
- Logs are JSON and shipped to the central aggregator; filter on `route` to isolate handlers.

## SLO tracking

- `lib/obs/slo` keeps the last 200 samples per route. Access `/api/admin/health` for a quick snapshot.
- A sample breach emits the `slo.breach` analytics event; monitor GA/Meta dashboards for spikes.

## Rate limits and abuse

- Sliding-window decisions land in `api_abuse_log`. Query by `route` to review offenders.
- `applyRateLimit` also populates `Retry-After` headers for clients.

## Feature flags

- Use `/api/debug/feature-flags` to inspect the current snapshot after auth.
- Admins can toggle flags via `/api/admin/flags/update` which invalidates the server cache immediately.
