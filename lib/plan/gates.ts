// lib/plan/gates.ts
// Declarative feature limits per subscription tier.

import { PLANS, type PlanId } from '@/types/pricing';

type WritingGateConfig = {
  aiEvaluationsPerDay: number;
  mockStartsPerDay: number;
  storageGB: number;
  exportPdf: boolean;
  certificateAccess: boolean;
  xpDailyCap: number;
  installPrompt: boolean;
  pushNotifications: boolean;
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
      aiEvaluationsPerDay: PLANS.free.quota.aiEvaluationsPerDay,
      mockStartsPerDay: PLANS.free.quota.dailyMocks,
      storageGB: PLANS.free.quota.storageGB,
      exportPdf: false,
      certificateAccess: false,
      xpDailyCap: 120,
      installPrompt: false,
      pushNotifications: false,
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
      aiEvaluationsPerDay: PLANS.starter.quota.aiEvaluationsPerDay,
      mockStartsPerDay: PLANS.starter.quota.dailyMocks,
      storageGB: PLANS.starter.quota.storageGB,
      exportPdf: false,
      certificateAccess: false,
      xpDailyCap: 200,
      installPrompt: true,
      pushNotifications: true,
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
      aiEvaluationsPerDay: PLANS.booster.quota.aiEvaluationsPerDay,
      mockStartsPerDay: PLANS.booster.quota.dailyMocks,
      storageGB: PLANS.booster.quota.storageGB,
      exportPdf: true,
      certificateAccess: true,
      xpDailyCap: 320,
      installPrompt: true,
      pushNotifications: true,
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
      aiEvaluationsPerDay: PLANS.master.quota.aiEvaluationsPerDay,
      mockStartsPerDay: PLANS.master.quota.dailyMocks,
      storageGB: PLANS.master.quota.storageGB,
      exportPdf: true,
      certificateAccess: true,
      xpDailyCap: 420,
      installPrompt: true,
      pushNotifications: true,
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
  | 'writing.storage'
  | 'writing.install.prompt'
  | 'writing.push.optin'
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
    case 'writing.storage':
      return gates.writing.storageGB > 0;
    case 'writing.install.prompt':
      return gates.writing.installPrompt;
    case 'writing.push.optin':
      return gates.writing.pushNotifications;
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

export function writingStorageLimit(plan: PlanId): number {
  return getPlanGates(plan).writing.storageGB;
}

export function writingInstallPromptEnabled(plan: PlanId): boolean {
  return getPlanGates(plan).writing.installPrompt;
}

export function writingPushOptInEnabled(plan: PlanId): boolean {
  return getPlanGates(plan).writing.pushNotifications;
}

