import React, { useState } from 'react';
import { Download, Smartphone, X, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

export const PWAInstallBanner: React.FC = () => {
  const { canInstall, isInstalled, isIOS, isMobile, dismissed, triggerInstall, dismissBanner } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  // Show banner on mobile devices if not already installed and not dismissed
  // Also show subtle prompt if desktop canInstall
  if (isInstalled || dismissed || !canInstall) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setModalOpen(true);
    } else {
      const outcome = await triggerInstall();
      if (outcome === 'manual_ios') {
        setModalOpen(true);
      }
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-indigo-700 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 relative z-30 border-b border-sky-500/30">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
            <Smartphone className="w-4 h-4 text-sky-200" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight truncate">
              {isMobile ? '📲 Descargar App Agenfacil en tu teléfono' : '💻 Instalar Agenfacil en tu dispositivo'}
            </p>
            <p className="text-[11px] text-sky-100/90 leading-tight hidden sm:block truncate">
              Úsala como app web instalada con acceso directo y alertas push en tiempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-white text-sky-700 hover:bg-sky-50 active:bg-sky-100 text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-600" />
            <span>Instalar</span>
          </button>
          <button
            onClick={dismissBanner}
            title="Cerrar aviso"
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <PWAInstallModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onInstallClick={triggerInstall}
        isIOS={isIOS}
      />
    </>
  );
};
