// public/sw-push.js
// Handle push messages delivered via the Workbox service worker bundle so
// notification actions can focus an existing tab or open the right page.

const isProd = typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production';

const logPushError = (message, error) => {
  if (typeof console === 'undefined') return;
  if (isProd) return;
  // eslint-disable-next-line no-console
  console.warn(message, error);
};

const normalizeActionList = (actions) => {
  if (!Array.isArray(actions)) return [];
  return actions
    .filter((action) => action && typeof action === 'object')
    .map((action) => ({
      action: String(action.action || action.id || ''),
      title: String(action.title || action.label || ''),
      url: action.url ? String(action.url) : undefined,
      analytics: action.analytics ?? undefined,
    }))
    .filter((action) => action.action);
};

self.addEventListener('push', (event) => {
  if (!event) return;

  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = { title: event.data?.text?.() };
  }

  const title = payload.title || 'GramorX';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.svg',
    badge: payload.badge || '/icon-192.svg',
    data: {
      url: payload.url,
      actions: normalizeActionList(payload.actions),
      meta: payload.meta || {},
    },
    actions: normalizeActionList(payload.actions).map((action) => ({
      action: action.action,
      title: action.title,
    })),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

const focusOrOpen = async (url) => {
  if (!url) return null;
  const targetUrl = new URL(url, self.location.origin).href;
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientList) {
    if (client.url === targetUrl) {
      await client.focus();
      return client;
    }
  }
  return self.clients.openWindow(targetUrl);
};

self.addEventListener('notificationclick', (event) => {
  if (!event) return;
  event.notification.close();

  const data = event.notification?.data || {};
  const actions = normalizeActionList(data.actions);
  const selected = actions.find((action) => action.action === event.action) || null;
  const destination = selected?.url || data.url || null;

  const broadcast = async () => {
    try {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        client.postMessage({
          type: 'PUSH_ACTION',
          action: event.action || null,
          destination,
          metadata: data.meta || {},
        });
      }
    } catch (error) {
      logPushError('[sw-push] failed to broadcast push action', error);
    }
  };

  event.waitUntil(
    Promise.all([
      destination ? focusOrOpen(destination) : Promise.resolve(null),
      broadcast(),
    ]).catch((error) => {
      logPushError('[sw-push] notificationclick handler failed', error);
    }),
  );
});
