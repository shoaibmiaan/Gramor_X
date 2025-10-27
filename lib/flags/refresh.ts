// lib/flags/refresh.ts
// Safe, non-blocking refresher for client-side feature or plan flags.
// Prevents the "refreshClientFlags is not defined" runtime error.

export const flagsHydratedRef = { current: false };

export async function refreshClientFlags(): Promise<void> {
  try {
    await fetch('/api/flags/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'auth-state-changed' }),
      keepalive: true, // don't block navigation if tab closes
    });
  } catch {
    // swallow error silently — not critical
  } finally {
    flagsHydratedRef.current = true;
  }
}
