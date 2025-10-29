const FALLBACK_ICON = '/icon-192.svg';
const FALLBACK_BADGE = '/icon-192.svg';

self.addEventListener('push', (event) => {
  if (!event?.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (error) {
    console.warn('[push-handler] failed to parse payload', error);
    return;
  }

  const title = payload.title || 'Gramor X';
  const body = payload.body || '';
  const data = payload.data || {};
  const notificationOptions = {
    body,
    icon: payload.icon || FALLBACK_ICON,
    badge: payload.badge || FALLBACK_BADGE,
    data: {
      ...data,
      url: payload.url || data.url || '/',
      topic: payload.topic || data.topic || null,
      receivedAt: Date.now(),
    },
    actions: Array.isArray(payload.actions) ? payload.actions : undefined,
    renotify: !!payload.renotify,
    tag: payload.tag || data.tag,
    requireInteraction: !!payload.requireInteraction,
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions).then(() =>
      broadcastToClients({ type: 'PUSH_RECEIVED', payload: notificationOptions.data }),
    ),
  );
});

self.addEventListener('notificationclick', (event) => {
  const targetUrl = event.notification?.data?.url || '/';
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const absolute = new URL(targetUrl, self.location.origin);
        for (const client of clients) {
          if ('focus' in client && client.url.includes(absolute.pathname)) {
            client.postMessage({ type: 'PUSH_OPEN', payload: event.notification.data });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(absolute.href);
        }
        return undefined;
      })
      .catch((error) => {
        console.warn('[push-handler] notificationclick failed', error);
      }),
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(broadcastToClients({ type: 'PUSH_SUBSCRIPTION_CHANGE' }));
});

async function broadcastToClients(message) {
  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage(message);
    }
  } catch (error) {
    console.warn('[push-handler] failed to broadcast', error);
  }
}
