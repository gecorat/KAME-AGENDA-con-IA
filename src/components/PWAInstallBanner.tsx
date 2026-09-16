import React, { useState } from 'react';
import { Download, Smartphone, X, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

export const PWAInstallBanner: React.FC = () => {
  const { canInstall, isInstalled, isIOS, isMobile, hasNativePrompt, dismissed, triggerInstall, dismissBanner } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  // If already installed or dismissed, do not show the floating prompt
  if (isInstalled || dismissed || !canInstall) {
    return (
      <PWAInstallModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onInstallClick={triggerInstall}
        isIOS={isIOS}
        hasNativePrompt={hasNativePrompt}
      />
    );
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setModalOpen(true);
    } else {
      const outcome = await triggerInstall();
      if (outcome === 'manual_ios' || outcome === 'manual_other') {
        setModalOpen(true);
      }
    }
  };

  return (
    <>
      {/* Floating prompt docked at bottom for high visibility on mobile */}
      <div
        id="pwa-install-prompt-banner"
        className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
      >
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-teal-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative shrink-0">
              <img
                src="/pwa-192x192.png"
                alt="Agenfacil"
                className="w-11 h-11 rounded-xl object-cover shadow-md border border-white/20"
              />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-950/80 px-1.5 py-0.5 rounded border border-teal-800/60">
                  {isMobile ? 'App Móvil' : 'Web App'}
                </span>
                <span className="text-xs font-bold text-white truncate">
                  Instalar Agenfacil
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight truncate">
                {isMobile ? 'Acceso rápido en tu inicio, más veloz y sin barra.' : 'Instala la aplicación en tu pantalla de inicio.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              id="btn-pwa-install-action"
              onClick={handleInstallClick}
              className="px-3.5 py-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </button>
            <button
              type="button"
              onClick={dismissBanner}
              title="Cerrar aviso"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Cerrar aviso de instalación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <PWAInstallModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onInstallClick={triggerInstall}
        isIOS={isIOS}
        hasNativePrompt={hasNativePrompt}
      />
    </>
  );
};
