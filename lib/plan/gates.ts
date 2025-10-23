// lib/plan/gates.ts
// Declarative feature limits per subscription tier.

import type { PlanId } from '@/types/pricing';

type WritingGateConfig = {
  aiEvaluationsPerDay: number;
  mockStartsPerDay: number;
  exportPdf: boolean;
  certificateAccess: boolean;
  xpDailyCap: number;
};

type AdminGateConfig = {
  healthDashboard: boolean;
  canImpersonate: boolean;
};

type AnalyticsGateConfig = {
  advancedWriting: boolean;
  perfBudgets: boolean;
};

type PlanGateConfig = {
  writing: WritingGateConfig;
  analytics: AnalyticsGateConfig;
  admin: AdminGateConfig;
};

const PLAN_GATES: Record<PlanId, PlanGateConfig> = {
  free: {
    writing: {
      aiEvaluationsPerDay: 2,
      mockStartsPerDay: 1,
      exportPdf: false,
      certificateAccess: false,
      xpDailyCap: 120,
    },
    analytics: {
      advancedWriting: false,
      perfBudgets: false,
    },
    admin: {
      healthDashboard: false,
      canImpersonate: false,
    },
  },
  starter: {
    writing: {
      aiEvaluationsPerDay: 10,
      mockStartsPerDay: 2,
      exportPdf: false,
      certificateAccess: false,
      xpDailyCap: 200,
    },
    analytics: {
      advancedWriting: true,
      perfBudgets: false,
    },
    admin: {
      healthDashboard: false,
      canImpersonate: false,
    },
  },
  booster: {
    writing: {
      aiEvaluationsPerDay: 40,
      mockStartsPerDay: 5,
      exportPdf: true,
      certificateAccess: true,
      xpDailyCap: 320,
    },
    analytics: {
      advancedWriting: true,
      perfBudgets: true,
    },
    admin: {
      healthDashboard: true,
      canImpersonate: true,
    },
  },
  master: {
    writing: {
      aiEvaluationsPerDay: 120,
      mockStartsPerDay: 10,
      exportPdf: true,
      certificateAccess: true,
      xpDailyCap: 420,
    },
    analytics: {
      advancedWriting: true,
      perfBudgets: true,
    },
    admin: {
      healthDashboard: true,
      canImpersonate: true,
    },
  },
};

export type PlanGateKey =
  | 'writing.export.pdf'
  | 'writing.certificate'
  | 'writing.ai.daily'
  | 'writing.mock.daily'
  | 'analytics.advanced'
  | 'analytics.perfBudgets'
  | 'admin.health'
  | 'admin.impersonate';

export function getPlanGates(plan: PlanId): PlanGateConfig {
  return PLAN_GATES[plan] ?? PLAN_GATES.free;
}

export function planAllows(plan: PlanId, feature: PlanGateKey): boolean {
  const gates = getPlanGates(plan);
  switch (feature) {
    case 'writing.export.pdf':
      return gates.writing.exportPdf;
    case 'writing.certificate':
      return gates.writing.certificateAccess;
    case 'writing.ai.daily':
      return gates.writing.aiEvaluationsPerDay > 0;
    case 'writing.mock.daily':
      return gates.writing.mockStartsPerDay > 0;
    case 'analytics.advanced':
      return gates.analytics.advancedWriting;
    case 'analytics.perfBudgets':
      return gates.analytics.perfBudgets;
    case 'admin.health':
      return gates.admin.healthDashboard;
    case 'admin.impersonate':
      return gates.admin.canImpersonate;
    default:
      return false;
  }
}

export function writingAiLimit(plan: PlanId): number {
  return getPlanGates(plan).writing.aiEvaluationsPerDay;
}

export function writingMockLimit(plan: PlanId): number {
  return getPlanGates(plan).writing.mockStartsPerDay;
}

export function xpDailyCap(plan: PlanId): number {
  return getPlanGates(plan).writing.xpDailyCap;
}

