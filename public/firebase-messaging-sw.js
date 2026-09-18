// Service Worker para Firebase Cloud Messaging (FCM) en segundo plano
// Permite que el profesional reciba alertas críticas de turnos en su celular aunque la app esté cerrada o bloqueada.

importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

firebase.initializeApp({
  projectId: "gen-lang-client-0700931315",
  appId: "1:381620560620:web:a6fb02168a410d50657bc9",
  apiKey: "AIzaSyC7EZMiLrQ8ssuH45Lg_1HJJEyORT_D1Gk",
  messagingSenderId: "381620560620"
});

const messaging = firebase.messaging();

function buildNotificationOptions(payload) {
  const isCritical = payload.data?.critical === 'true' || payload.data?.priority === 'high';
  const notificationTitle = payload.notification?.title || payload.data?.title || '🔔 Agenfacil: Aviso de Turno';
  const bodyText = payload.notification?.body || payload.data?.body || 'Nueva novedad en tu agenda.';

  return {
    title: notificationTitle,
    options: {
      body: bodyText,
      icon: '/pwa-192x192.png',
      badge: '/icon.svg',
      tag: payload.data?.tag || (isCritical ? 'agenfacil-critical-turnos' : 'agenfacil-alert'),
      renotify: true,
      requireInteraction: isCritical,
      vibrate: isCritical ? [300, 100, 300, 100, 300, 100, 400] : [200, 100, 200],
      data: {
        url: payload.data?.url || '/#agenda',
        appointment_id: payload.data?.appointment_id || '',
        type: payload.data?.type || 'appointment_alert',
        ...(payload.data || {})
      },
      actions: [
        { action: 'open_agenda', title: '📅 Ver en Agenda' }
      ]
    }
  };
}

// Escuchar mensajes en segundo plano gestionados por FCM
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM-SW] Mensaje push recibido en segundo plano:', payload);
  const { title, options } = buildNotificationOptions(payload);
  self.registration.showNotification(title, options);
});

// Fallback para eventos push nativos del navegador
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const raw = event.data.json();
    if (raw && (raw.notification || raw.data)) {
      const { title, options } = buildNotificationOptions(raw);
      event.waitUntil(self.registration.showNotification(title, options));
    }
  } catch (e) {
    // Si no era JSON, mostrar texto simple
    const text = event.data.text();
    if (text) {
      event.waitUntil(
        self.registration.showNotification('🔔 Agenfacil: Aviso de Turno', {
          body: text,
          icon: '/pwa-192x192.png',
          badge: '/icon.svg',
          vibrate: [300, 100, 300]
        })
      );
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/#agenda';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client && client.url.indexOf(targetUrl) === -1) {
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
