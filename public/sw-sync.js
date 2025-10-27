// public/sw-sync.js
// Background sync hook that notifies open clients to process draft queues.

self.addEventListener('sync', (event) => {
  if (!event || event.tag !== 'gramor-draft-sync') {
    return;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'OFFLINE_SYNC', tag: event.tag });
        }
      })
      .catch((error) => {
        if (typeof console !== 'undefined') {
          console.warn('[sw-sync] failed to notify clients', error);
        }
      }),
  );
});
