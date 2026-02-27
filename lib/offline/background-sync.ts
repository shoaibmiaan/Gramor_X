// lib/offline/background-sync.ts
// High-level helpers for queueing writing drafts/events offline and
// nudging the sync orchestrator to replay them once connectivity is restored.

import {
  queueWritingDraft,
  queueExamEvent,
  type WritingDraftQueuePayload,
  type ExamEventQueuePayload,
} from '@/lib/offline/draftQueue';
import {
  ensureDraftSyncOrchestrator,
  registerDraftBackgroundSync,
} from '@/lib/offline/syncOrchestrator';

const hasWindow = () => typeof window !== 'undefined';

let backgroundRegistered = false;

let queueDraftImpl = queueWritingDraft;
let queueEventImpl = queueExamEvent;
let ensureOrchestratorImpl = ensureDraftSyncOrchestrator;
let registerBackgroundImpl = registerDraftBackgroundSync;

type DraftSyncInstance = NonNullable<ReturnType<typeof ensureDraftSyncOrchestrator>>;
type SyncReason = Parameters<DraftSyncInstance['requestSync']>[0];

const requestBackgroundRegistration = () => {
  if (!hasWindow() || backgroundRegistered) return;
  backgroundRegistered = true;
  void registerBackgroundImpl().catch(() => {
    backgroundRegistered = false;
  });
};

const requestSync = (reason: SyncReason) => {
  const orchestrator = ensureOrchestratorImpl();
  orchestrator?.requestSync(reason);
};

export async function queueDraftForOffline(payload: WritingDraftQueuePayload) {
  const record = await queueDraftImpl(payload);
  if (!record) {
    return null;
  }

  requestSync('queued');
  requestBackgroundRegistration();
  return record;
}

export async function queueEventForOffline(payload: ExamEventQueuePayload) {
  const record = await queueEventImpl(payload);
  if (!record) {
    return null;
  }

  requestSync('queued');
  requestBackgroundRegistration();
  return record;
}

export function replayOfflineQueue(reason: SyncReason = 'manual') {
  requestSync(reason);
}

export function ensureOfflineSyncInitialized() {
  requestBackgroundRegistration();
  ensureOrchestratorImpl();
}

export function __resetOfflineBackgroundRegistrationForTests() {
  backgroundRegistered = false;
  queueDraftImpl = queueWritingDraft;
  queueEventImpl = queueExamEvent;
  ensureOrchestratorImpl = ensureDraftSyncOrchestrator;
  registerBackgroundImpl = registerDraftBackgroundSync;
}

export function __setOfflineBackgroundSyncMocks(overrides: {
  queueDraft?: typeof queueWritingDraft;
  queueEvent?: typeof queueExamEvent;
  ensureOrchestrator?: typeof ensureDraftSyncOrchestrator;
  registerBackground?: typeof registerDraftBackgroundSync;
}) {
  if (overrides.queueDraft) queueDraftImpl = overrides.queueDraft;
  if (overrides.queueEvent) queueEventImpl = overrides.queueEvent;
  if (overrides.ensureOrchestrator) ensureOrchestratorImpl = overrides.ensureOrchestrator;
  if (overrides.registerBackground) registerBackgroundImpl = overrides.registerBackground;
}
