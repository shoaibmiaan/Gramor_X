// lib/config/launchDate.ts

const DEFAULT_LAUNCH_ISO = '2025-12-02T00:00:00.000Z';

function parseIsoToMs(iso: string | undefined | null): number | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getLaunchIso(): string {
  return process.env.NEXT_PUBLIC_LAUNCH_ISO || DEFAULT_LAUNCH_ISO;
}

export function getLaunchMsUTC(): number {
  const fromEnv = parseIsoToMs(process.env.NEXT_PUBLIC_LAUNCH_ISO);
  if (fromEnv !== null) {
    return fromEnv;
  }

  const fallback = parseIsoToMs(DEFAULT_LAUNCH_ISO);
  return fallback ?? Date.now();
}

export function getDefaultLaunchIso(): string {
  return DEFAULT_LAUNCH_ISO;
}

export type LaunchTiming = {
  launchMsUTC: number;
  launchIso: string;
};

export function getLaunchTiming(): LaunchTiming {
  const launchIso = getLaunchIso();
  return {
    launchIso,
    launchMsUTC: parseIsoToMs(launchIso) ?? parseIsoToMs(DEFAULT_LAUNCH_ISO) ?? Date.now(),
  };
}
