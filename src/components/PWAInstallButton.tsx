import React, { useState } from 'react';
import { Smartphone, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'sidebar' | 'banner' | 'settings';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header'
}) => {
  const { canInstall, isInstalled, isIOS, hasNativePrompt, triggerInstall } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  if (isInstalled || !canInstall) {
    return null;
  }

  const handleClick = async () => {
    if (isIOS) {
      setModalOpen(true);
    } else {
      const outcome = await triggerInstall();
      if (outcome === 'manual_ios' || outcome === 'manual_other') {
        setModalOpen(true);
      }
    }
  };

  if (variant === 'sidebar') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 rounded-xl transition-all cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-teal-700" />
            <span>Instalar App en Celular</span>
          </div>
          <span className="text-[10px] bg-teal-700 text-white font-bold px-1.5 py-0.5 rounded">
            PWA
          </span>
        </button>

        <PWAInstallModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onInstallClick={triggerInstall}
          isIOS={isIOS}
          hasNativePrompt={hasNativePrompt}
        />
      </>
    );
  }

  if (variant === 'settings') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>Instalar Agenfacil en este Dispositivo</span>
        </button>

        <PWAInstallModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onInstallClick={triggerInstall}
          isIOS={isIOS}
          hasNativePrompt={hasNativePrompt}
        />
      </>
    );
  }

  // Default 'header' button
  return (
    <>
      <button
        type="button"
        id="btn-header-install-pwa"
        onClick={handleClick}
        className={`px-2.5 py-1 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-lg shadow-2xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${className}`}
        title="Instalar versión móvil"
      >
        <Smartphone className="w-3.5 h-3.5 text-teal-700" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">App</span>
      </button>

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
