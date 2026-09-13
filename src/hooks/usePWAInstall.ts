import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('agenfacil_pwa_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Detect standalone mode (already installed)
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);
    };

    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);

    // Detect iOS & Mobile
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua) || window.innerWidth < 768;
    setIsIOS(isIosDevice);
    setIsMobile(isMobileDevice);

    // Capture beforeinstallprompt on Chromium / Android
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

  const triggerInstall = async (): Promise<'accepted' | 'dismissed' | 'manual_ios'> => {
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
        return 'dismissed';
      }
    } else if (isIOS && !isInstalled) {
      return 'manual_ios';
    }
    return 'dismissed';
  };

  const dismissBanner = () => {
    setDismissed(true);
    try {
      localStorage.setItem('agenfacil_pwa_dismissed', 'true');
    } catch {}
  };

  const resetDismiss = () => {
    setDismissed(false);
    try {
      localStorage.removeItem('agenfacil_pwa_dismissed');
    } catch {}
  };

  return {
    canInstall: (!!installPrompt || isIOS) && !isInstalled,
    isInstalled,
    isIOS,
    isMobile,
    dismissed,
    triggerInstall,
    dismissBanner,
    resetDismiss
  };
}
