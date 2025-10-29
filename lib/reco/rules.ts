// lib/reco/rules.ts
// Deterministic, explainable rule engine for next best learning tasks.

import { PLAN_RANK, type PlanId } from '@/types/pricing';
import type {
  LearningModule,
  LearningProfileRow,
  LearningSignal,
  LearningTask,
} from '@/types/supabase';

export type RecommendationEvidence = {
  headline: string;
  detail?: string;
};

export type RecommendationResult = {
  task: LearningTask;
  score: number;
  reason: string;
  evidence: RecommendationEvidence[];
};

export type RecommendationContext = {
  plan: PlanId;
  profile: LearningProfileRow | null;
  signals: LearningSignal[];
  tasks: LearningTask[];
  recentModules: LearningModule[];
};

const TARGETS: Record<string, number> = {
  speaking_pron: 0.85,
  speaking_fluency: 0.82,
  reading_tfng: 0.75,
  reading_mcq: 0.78,
  writing_task2: 0.8,
  vocab_range: 0.8,
  listening_accuracy: 0.8,
};

const MODULE_LABEL: Record<LearningModule, string> = {
  speaking: 'speaking',
  reading: 'reading',
  writing: 'writing',
  listening: 'listening',
  vocab: 'vocabulary',
};

type Deficit = {
  key: keyof typeof TARGETS;
  module: LearningModule;
  current: number | null;
  target: number;
  severity: number; // 0..1 normalised gap
};

const DEFICIT_MODULE: Record<keyof typeof TARGETS, LearningModule> = {
  speaking_pron: 'speaking',
  speaking_fluency: 'speaking',
  reading_tfng: 'reading',
  reading_mcq: 'reading',
  writing_task2: 'writing',
  vocab_range: 'vocab',
  listening_accuracy: 'listening',
};

const VARIETY_COOLDOWN = 2; // discourage repeating the same module twice in a row

const IPA_SIGNAL_PREFIX = 'speaking.ipa:';

function normaliseScore(current: unknown, target: number): { value: number | null; severity: number } {
  if (typeof current !== 'number' || Number.isNaN(current)) {
    return { value: null, severity: 1 };
  }

  const clamped = Math.min(Math.max(current, 0), 1);
  const deficit = Math.max(0, target - clamped);
  const severity = target <= 0 ? 0 : Math.min(1, deficit / target);
  return { value: clamped, severity };
}

function buildDeficits(profile: LearningProfileRow | null): Deficit[] {
  return (Object.keys(TARGETS) as Array<keyof typeof TARGETS>)
    .map((key) => {
      const target = TARGETS[key];
      const current = profile ? (profile as Record<string, unknown>)[key] : null;
      const { value, severity } = normaliseScore(current as number | null, target);
      return {
        key,
        module: DEFICIT_MODULE[key],
        current: value,
        target,
        severity,
      } satisfies Deficit;
    })
    .sort((a, b) => b.severity - a.severity);
}

type WeakPhoneme = {
  symbol: string;
  value: number;
  occurred_at: string;
};

function detectWeakPhonemes(signals: LearningSignal[]): WeakPhoneme[] {
  const map = new Map<string, WeakPhoneme>();

  signals.forEach((signal) => {
    if (!signal.key.startsWith(IPA_SIGNAL_PREFIX)) return;
    const symbol = signal.key.slice(IPA_SIGNAL_PREFIX.length);
    if (!symbol) return;
    const accuracy = typeof signal.value === 'number' ? signal.value : Number(signal.value);
    if (Number.isNaN(accuracy) || accuracy >= 0.85) return;

    const existing = map.get(symbol);
    if (!existing || existing.occurred_at < signal.occurred_at) {
      map.set(symbol, {
        symbol,
        value: Math.max(0, Math.min(1, accuracy)),
        occurred_at: signal.occurred_at,
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.value - b.value);
}

function meetsPlan(task: LearningTask, plan: PlanId) {
  return PLAN_RANK[plan] >= PLAN_RANK[task.min_plan];
}

function moduleFatiguePenalty(task: LearningTask, recentModules: LearningModule[]) {
  if (!recentModules.length) return 0;
  const first = recentModules[0];
  const penalty = task.module === first ? 0.4 : recentModules.slice(0, VARIETY_COOLDOWN).includes(task.module) ? 0.2 : 0;
  return penalty;
}

function severityForTask(task: LearningTask, deficits: Deficit[]): Deficit | null {
  const byModule = deficits.filter((d) => d.module === task.module);
  if (!byModule.length) return null;

  const directMatch = byModule.find((d) => task.tags.some((tag) => tag === `focus:${d.key}`));
  if (directMatch) return directMatch;

  return byModule[0];
}

function buildReason(task: LearningTask, deficit: Deficit | null, weak: WeakPhoneme | null): string {
  const segments: string[] = [];
  if (deficit) {
    const moduleLabel = MODULE_LABEL[deficit.module];
    const targetPct = Math.round(deficit.target * 100);
    const currentPct = deficit.current != null ? Math.round(deficit.current * 100) : null;
    const gap = currentPct != null ? targetPct - currentPct : null;
    if (gap != null && gap > 0) {
      segments.push(`Your ${moduleLabel} score for ${deficit.key.replace(/_/g, ' ')} is tracking about ${gap} points below the target.`);
    } else if (deficit.current == null) {
      segments.push(`We need fresh data for your ${moduleLabel} performance on ${deficit.key.replace(/_/g, ' ')}.`);
    }
  }

  if (weak) {
    segments.push(`Recent attempts flagged /${weak.symbol}/ accuracy at ${(weak.value * 100).toFixed(0)}%.`);
  }

  if (!segments.length) {
    segments.push(`Stay consistent with a ${MODULE_LABEL[task.module]} action aligned to your study path.`);
  }

  return segments.join(' ');
}

function scoreTask(
  task: LearningTask,
  deficits: Deficit[],
  weakPhonemes: WeakPhoneme[],
  recentModules: LearningModule[],
): RecommendationEvidence & { score: number; deficit: Deficit | null; weak: WeakPhoneme | null } {
  const deficit = severityForTask(task, deficits);
  const weak = weakPhonemes.find((entry) => task.tags.includes(`ipa:${entry.symbol}`)) ?? null;

  let score = 0;
  if (deficit) {
    score += 3 * deficit.severity;
    if (task.tags.includes(`focus:${deficit.key}`)) {
      score += 1.5;
    }
  }

  if (weak) {
    score += 1.25 * (1 - weak.value);
  }

  // Encourage shorter actions when scores tie.
  score += Math.max(0, 1 - task.est_minutes / 30);

  // Variety penalty
  score -= moduleFatiguePenalty(task, recentModules);

  return {
    headline: buildReason(task, deficit, weak),
    detail: weak ? `Focus on /${weak.symbol}/ accuracy improvements.` : undefined,
    score,
    deficit,
    weak,
  };
}

export function pickNextTask(context: RecommendationContext): RecommendationResult | null {
  const { plan, profile, signals, tasks, recentModules } = context;

  const eligibleTasks = tasks.filter((task) => task.is_active && meetsPlan(task, plan));
  if (!eligibleTasks.length) {
    return null;
  }

  const deficits = buildDeficits(profile);
  const weakPhonemes = detectWeakPhonemes(signals);

  const scored = eligibleTasks
    .map((task) => {
      const evaluation = scoreTask(task, deficits, weakPhonemes, recentModules);
      return { task, evaluation };
    })
    .sort((a, b) => b.evaluation.score - a.evaluation.score);

  const top = scored[0];
  if (!top) {
    return null;
  }

  const evidence: RecommendationEvidence[] = [];
  if (top.evaluation.deficit) {
    const def = top.evaluation.deficit;
    const currentPct = def.current != null ? Math.round(def.current * 100) : null;
    evidence.push({
      headline: `${MODULE_LABEL[def.module]} focus`,
      detail:
        currentPct != null
          ? `${def.key.replace(/_/g, ' ')} at ${currentPct}% (target ${Math.round(def.target * 100)}%).`
          : `No recent score for ${def.key.replace(/_/g, ' ')} — filling the gap.`,
    });
  }

  if (top.evaluation.weak) {
    const weak = top.evaluation.weak;
    evidence.push({
      headline: `Weak phoneme`,
      detail: `/${weak.symbol}/ accuracy ${(weak.value * 100).toFixed(0)}% from last attempt.`,
    });
  }

  const reason = top.evaluation.headline;

  return {
    task: top.task,
    score: top.evaluation.score,
    reason,
    evidence,
  };
}
