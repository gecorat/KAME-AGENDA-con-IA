// Integración de Firebase Cloud Messaging (FCM) para Notificaciones Push Reales
// Soporta tanto Web Push en escritorio como en dispositivos móviles (PWA/Android).

import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { app } from './firestore-sync';

let messagingInstance: Messaging | null = null;

export const initFCM = async (): Promise<Messaging | null> => {
  if (typeof window === 'undefined') return null;
  const supported = await isSupported().catch(() => false);
  if (!supported) {
    console.log('[FCM] Firebase Messaging no está soportado en este entorno/navegador.');
    return null;
  }
  if (!messagingInstance) {
    try {
      messagingInstance = getMessaging(app);
    } catch (e) {
      console.warn('[FCM] Error inicializando Firebase Messaging:', e);
    }
  }
  return messagingInstance;
};

/**
 * Solicita permisos de notificación y registra el token FCM del dispositivo en el servidor.
 */
export const solicitarYRegistrarPushFCM = async (ownerId?: string | null): Promise<{ ok: boolean; token?: string; error?: string }> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { ok: false, error: 'Las notificaciones no están soportadas en este navegador.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, error: 'Permiso de notificaciones denegado por el usuario.' };
    }

    const messaging = await initFCM();
    if (!messaging) {
      return { ok: false, error: 'Firebase Cloud Messaging no disponible.' };
    }

    // Registrar o reutilizar el Service Worker
    let swReg: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        console.warn('[FCM] Error registrando service worker:', swErr);
      }
    }

    // Obtener el token de registro de FCM
    const token = await getToken(messaging, {
      serviceWorkerRegistration: swReg
    });

    if (!token) {
      return { ok: false, error: 'No se pudo generar el token de dispositivo.' };
    }

    console.log('[FCM] Token de dispositivo obtenido correctamente:', token.slice(0, 15) + '...');

    // Enviar el token al servidor para asociarlo con la cuenta del profesional
    if (ownerId) {
      fetch('/api/push/registrar-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: ownerId,
          token,
          user_agent: navigator.userAgent
        })
      }).catch(err => console.warn('[FCM] Error enviando token al backend:', err));
    }

    return { ok: true, token };
  } catch (err: any) {
    console.error('[FCM] Error al activar notificaciones push:', err);
    return { ok: false, error: err?.message || 'Error al activar notificaciones push.' };
  }
};

/**
 * Escucha notificaciones push mientras la aplicación está en primer plano
 */
export const escucharNotificacionesEnPrimerPlano = (
  onMessageReceived: (payload: { title: string; body: string; data?: any }) => void
) => {
  initFCM().then(messaging => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      console.log('[FCM] Notificación recibida en primer plano:', payload);
      const title = payload.notification?.title || payload.data?.title || '🔔 Agenfacil';
      const body = payload.notification?.body || payload.data?.body || 'Nueva notificación';
      onMessageReceived({
        title,
        body,
        data: payload.data
      });
    });
  }).catch(() => {});
};

/**
 * Envía una alerta crítica de turno al celular del profesional a través del backend FCM.
 */
export const enviarAlertaCriticaFCM = async (params: {
  ownerId: string;
  title: string;
  body: string;
  appointmentId?: string;
  url?: string;
}): Promise<{ ok: boolean; sent?: number; error?: string }> => {
  try {
    const res = await fetch('/api/push/send-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_id: params.ownerId,
        title: params.title,
        body: params.body,
        priority: 'high',
        critical: true,
        appointment_id: params.appointmentId,
        url: params.url || '/#agenda'
      })
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al contactar servidor push' };
  }
};

/**
 * Re-sincroniza silenciosamente el token FCM si los permisos ya fueron otorgados por el usuario.
 */
export const sincronizarTokenSiPermitido = async (ownerId?: string | null) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted' && ownerId) {
    try {
      await solicitarYRegistrarPushFCM(ownerId);
    } catch (e) {
      console.warn('[FCM] Sincronización automática de token no completada:', e);
    }
  }
};
