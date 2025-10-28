import microPrompts from '@/data/writing/micro-prompts.json';

export type WritingNotificationChannel = 'in_app' | 'whatsapp' | 'email';
export type WritingNotificationType = 'micro_prompt' | 'retake_reminder';

const CHANNEL_WHITELIST: readonly WritingNotificationChannel[] = ['in_app', 'whatsapp', 'email'] as const;
const MICRO_PROMPTS = (microPrompts as string[]).filter((entry) => typeof entry === 'string' && entry.trim().length > 0);

export interface RetakePlanProgress {
  windowStart: string;
  windowEnd: string | null;
  redraftsCompleted: number;
  drillsCompleted: number;
  mocksCompleted: number;
}

export interface RetakePlanTargets {
  redrafts: number;
  drills: number;
  mocks: number;
}

export function ensureNotificationChannels(input: unknown): WritingNotificationChannel[] {
  const normalized = new Set<WritingNotificationChannel>(['in_app']);

  const attempt = (() => {
    if (!input) return [];
    if (Array.isArray(input)) return input;
    if (typeof input === 'string') return [input];
    if (typeof input === 'object') {
      if (Array.isArray((input as any).channels)) {
        return (input as any).channels;
      }
      if (Array.isArray((input as any).value)) {
        return (input as any).value;
      }
    }
    return [];
  })();

  attempt
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase())
    .forEach((value) => {
      const channel = CHANNEL_WHITELIST.find((candidate) => candidate === value);
      if (channel) normalized.add(channel);
    });

  return Array.from(normalized);
}

export function getDailyMicroPrompt(reference: Date = new Date()): { message: string; index: number } {
  const pool = MICRO_PROMPTS.length ? MICRO_PROMPTS : ['Practice a focused revision task today.'];
  const seed = new Date(reference);
  seed.setUTCHours(0, 0, 0, 0);
  const epochDay = Math.floor(seed.getTime() / 86_400_000);
  const index = ((epochDay % pool.length) + pool.length) % pool.length;
  return { message: pool[index], index };
}

export function isSameUtcDay(a: Date | string, b: Date | string): boolean {
  const first = new Date(a);
  const second = new Date(b);
  return (
    first.getUTCFullYear() === second.getUTCFullYear() &&
    first.getUTCMonth() === second.getUTCMonth() &&
    first.getUTCDate() === second.getUTCDate()
  );
}

export function buildRetakeReminder(
  progress: RetakePlanProgress,
  targets: RetakePlanTargets = { redrafts: 6, drills: 8, mocks: 2 },
): { message: string; missing: string[]; completion: number } {
  const missing: string[] = [];
  const ratios: number[] = [];

  const pairs: Array<{ label: string; completed: number; target: number }> = [
    { label: 'redraft', completed: progress.redraftsCompleted, target: Math.max(targets.redrafts, 1) },
    { label: 'drill', completed: progress.drillsCompleted, target: Math.max(targets.drills, 1) },
    { label: 'mock', completed: progress.mocksCompleted, target: Math.max(targets.mocks, 1) },
  ];

  pairs.forEach(({ label, completed, target }) => {
    const ratio = Math.min(completed / target, 1);
    ratios.push(ratio);
    if (completed < target) {
      const remaining = target - completed;
      const noun = `${label}${remaining === 1 ? '' : 's'}`;
      missing.push(`${remaining} ${noun}`);
    }
  });

  const completion = Math.round((ratios.reduce((sum, value) => sum + value, 0) / ratios.length) * 100) / 100;
  const windowEnd = progress.windowEnd ? new Date(progress.windowEnd) : null;
  const deadline = windowEnd ? windowEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;

  let message: string;
  if (missing.length === 0) {
    message = 'Nice work—your 14-day retake plan is on track. Schedule the next attempt while momentum is high.';
  } else {
    const checklist = missing.join(' and ');
    message = `Keep the retake window alive by completing ${checklist}.`;
    if (deadline) {
      message += ` You have until ${deadline}.`;
    }
  }

  return { message, missing, completion };
}

export function shouldSendMicroPromptToday(lastSentAt: string | null | undefined, reference: Date = new Date()): boolean {
  if (!lastSentAt) return true;
  return !isSameUtcDay(lastSentAt, reference);
}

