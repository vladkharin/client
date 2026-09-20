// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    let payload;
    try {
      payload = event.data.json();
    } catch {
      payload = { title: 'CraftHive', body: event.data.text() };
    }

    const title =
      payload.notification?.title ||
      payload.title ||
      payload.data?.title ||
      'CraftHive';
    const body =
      payload.notification?.body ||
      payload.body ||
      payload.data?.body ||
      'Новое сообщение в чате';

    const url =
      payload.data?.url ||
      payload.fcmOptions?.link ||
      '/main';

    const options = {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      data: {
        url,
        dateOfArrival: Date.now(),
        ...(payload.data || {}),
      },
      actions: [
        {
          action: 'open',
          title: 'Открыть',
        },
      ],
      tag: payload.data?.chatId ? `chat-${payload.data.chatId}` : 'crafthive-chat',
      renotify: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[SW] Push display error:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/main';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client && client.url.includes('/main')) {
          if (targetUrl && client.navigate) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
