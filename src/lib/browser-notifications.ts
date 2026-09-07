// Browser & Audio notification utility for Agenfacil
// Alerts doctor for new appointments booked by the AI bot or confirmed by patients

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Checks whether the browser supports the Web Notifications API
 */
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Returns the current Notification permission status
 */
export const getNotificationPermission = (): NotificationPermissionStatus => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionStatus;
};

/**
 * Requests notification permission from the user
 */
export const requestNotificationPermission = async (): Promise<NotificationPermissionStatus> => {
  if (!isNotificationSupported()) return 'unsupported';
  
  try {
    const status = await Notification.requestPermission();
    return status as NotificationPermissionStatus;
  } catch (error) {
    console.warn('Could not request notification permission (iframe restriction or user dismissed):', error);
    return getNotificationPermission();
  }
};

/**
 * Plays an elegant acoustic chime using Web Audio API synthesis
 * No external audio files needed; works in all modern browsers and offline
 */
export const playNotificationSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: Gentle bell intro (587 Hz - D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.3);

    // Tone 2: Crisp confirmation chime (1046 Hz - C6 -> 1318 Hz - E6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.28);

    gain2.gain.setValueAtTime(0.25, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.1);
    osc2.stop(now + 0.55);
  } catch (err) {
    // AudioContext blocked or not allowed, ignore silently
  }
};

export interface BrowserNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

/**
 * Sends a native browser desktop notification if permission is granted
 */
export const sendBrowserNotification = (options: BrowserNotificationOptions): boolean => {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=128&auto=format&fit=crop&q=80',
      tag: options.tag || `agenda-notif-${Date.now()}`,
      badge: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=64&auto=format&fit=crop&q=80',
      silent: false // Rely on system chime or our synthetic chime
    });

    notification.onclick = (event) => {
      event.preventDefault();
      try {
        window.focus();
      } catch {}
      options.onClick?.();
      notification.close();
    };

    return true;
  } catch (error) {
    console.warn('Native notification failed to show:', error);
    return false;
  }
};
