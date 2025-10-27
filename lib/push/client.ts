import { env, isBrowser } from '@/lib/env';
import {
  DEFAULT_TOPICS,
  PushTopic,
  diffTopics,
  getStoredTopics,
  persistTopics,
  sanitizeTopics,
} from '@/lib/push/topics';

export type Platform = 'web' | 'ios' | 'android';

export type DeviceInfo = {
  id?: string;
  model?: string;
  os?: string;
  osVersion?: string;
  appVersion?: string;
  manufacturer?: string;
};

export type RegisterPushOptions = {
  topics?: PushTopic[];
  metadata?: Record<string, unknown> | null;
  platform?: Platform;
  device?: DeviceInfo | null;
};

export type RegisterResponse =
  | {
      ok: true;
      permission: NotificationPermission;
      topics: PushTopic[];
      subscription: SerializedSubscription;
      diff: { added: PushTopic[]; removed: PushTopic[] };
    }
  | {
      ok: false;
      reason: 'unsupported' | 'permission_denied';
      permission: NotificationPermission;
    };

export type SerializedSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string | null;
    auth: string | null;
  };
};

export function isPushSupported(): boolean {
  if (!isBrowser) return false;
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function ensurePushPermission(): Promise<NotificationPermission> {
  if (!isBrowser || !('Notification' in window)) return 'default';
  const current = Notification.permission;
  if (current === 'granted' || current === 'denied') return current;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function registerPush(options: RegisterPushOptions = {}): Promise<RegisterResponse> {
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported', permission: 'default' };
  }

  const permission = await ensurePushPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'permission_denied', permission };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const vapidKey = env.NEXT_PUBLIC_PUSH_PUBLIC_KEY;
    if (!vapidKey) {
      throw new Error('Missing NEXT_PUBLIC_PUSH_PUBLIC_KEY for web push registration.');
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  const serialized = serializeSubscription(subscription);
  const storedTopics = getStoredTopics();
  const targetTopics = sanitizeTopics(options.topics ?? storedTopics ?? DEFAULT_TOPICS);
  const topicDiff = diffTopics(storedTopics, targetTopics);

  await postRegistration(serialized, targetTopics, options);
  persistTopics(targetTopics);

  return { ok: true, permission, topics: targetTopics, subscription: serialized, diff: topicDiff };
}

export async function updatePushTopics(topics: PushTopic[]): Promise<RegisterResponse> {
  const targetTopics = sanitizeTopics(topics);
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported', permission: 'default' };
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return registerPush({ topics: targetTopics });
  }

  const serialized = serializeSubscription(subscription);
  const storedTopics = getStoredTopics();
  const topicDiff = diffTopics(storedTopics, targetTopics);

  await postRegistration(serialized, targetTopics, {});
  persistTopics(targetTopics);

  return {
    ok: true,
    permission: Notification.permission,
    topics: targetTopics,
    subscription: serialized,
    diff: topicDiff,
  };
}

export async function unregisterPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;
  const result = await subscription.unsubscribe();
  if (result) persistTopics(DEFAULT_TOPICS);
  return result;
}

async function postRegistration(
  subscription: SerializedSubscription,
  topics: PushTopic[],
  options: RegisterPushOptions,
) {
  const response = await fetch('/api/push/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: subscription.endpoint,
      subscription,
      topics,
      platform: options.platform ?? 'web',
      metadata: options.metadata ?? null,
      device: options.device ?? null,
    }),
  });

  if (!response.ok) {
    const payload = await safeJson(response);
    throw new Error(payload?.error ?? `Failed to register push token (${response.status})`);
  }
}

function serializeSubscription(sub: PushSubscription): SerializedSubscription {
  return {
    endpoint: sub.endpoint,
    expirationTime: sub.expirationTime,
    keys: {
      p256dh: encodeKey(sub.getKey('p256dh')),
      auth: encodeKey(sub.getKey('auth')),
    },
  };
}

function encodeKey(key: ArrayBuffer | null): string | null {
  if (!key) return null;
  const bytes = new Uint8Array(key);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
