import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'manual_ios' | 'manual_other';

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      const dismissedAt = localStorage.getItem('agenfacil_pwa_dismissed_at');
      if (dismissedAt) {
        // Keep dismissed for 12 hours only so users can be reminded later if desired
        const diff = Date.now() - Number(dismissedAt);
        if (diff < 12 * 60 * 60 * 1000) return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Detect standalone mode (already running as installed PWA)
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);
    };

    checkStandalone();
    const mediaMatcher = window.matchMedia('(display-mode: standalone)');
    try {
      mediaMatcher.addEventListener('change', checkStandalone);
    } catch {
      mediaMatcher.addListener(checkStandalone);
    }

    // Detect iOS & Mobile
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua) || (window.innerWidth < 768 && isTouch);
    setIsIOS(isIosDevice);
    setIsMobile(isMobileDevice);

    // Capture beforeinstallprompt on Chromium / Android / Edge
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const triggerInstall = async (): Promise<InstallOutcome> => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setInstallPrompt(null);
        }
        return choice.outcome;
      } catch (e) {
        console.error('Install prompt error:', e);
        return isIOS ? 'manual_ios' : 'manual_other';
      }
    } else if (isIOS && !isInstalled) {
      return 'manual_ios';
    } else if (!isInstalled) {
      return 'manual_other';
    }
    return 'dismissed';
  };

  const dismissBanner = () => {
    setDismissed(true);
    try {
      localStorage.setItem('agenfacil_pwa_dismissed_at', String(Date.now()));
    } catch {}
  };

  const resetDismiss = () => {
    setDismissed(false);
    try {
      localStorage.removeItem('agenfacil_pwa_dismissed_at');
    } catch {}
  };

  return {
    canInstall: !isInstalled && (Boolean(installPrompt) || isMobile || isIOS),
    hasNativePrompt: Boolean(installPrompt),
    isInstalled,
    isIOS,
    isMobile,
    dismissed,
    triggerInstall,
    dismissBanner,
    resetDismiss
  };
}
