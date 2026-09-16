import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, CheckCircle, Bell, X, Sparkles } from 'lucide-react';
import { useAgendaStore } from '../lib/store';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallClick?: () => void;
  isIOS?: boolean;
  hasNativePrompt?: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  onInstallClick,
  isIOS = false,
  hasNativePrompt = true
}) => {
  const { requestBrowserNotificationPermission, testBrowserNotification, notificationPermission } = useAgendaStore();
  const [pushTested, setPushTested] = useState(false);

  if (!isOpen) return null;

  const handleEnablePush = async () => {
    await requestBrowserNotificationPermission();
    await testBrowserNotification();
    setPushTested(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-sky-600 to-indigo-700 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white p-2 shadow-md flex items-center justify-center">
              <img src="/pwa-192x192.png" alt="Agenfacil Icon" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Instalar Agenfacil App</h3>
              <p className="text-xs text-sky-100 font-medium">Versión Web Progresiva para Móvil</p>
            </div>
          </div>
          <p className="text-xs text-sky-100 leading-relaxed mt-2">
            Úsala como una aplicación nativa en tu teléfono: acceso instantáneo en tu pantalla de inicio, mayor velocidad y notificaciones push en tiempo real.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {isIOS ? (
            /* iOS instructions */
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <Smartphone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  En <strong>iPhone o iPad (Safari)</strong>, Apple requiere instalar la app manualmente mediante el menú de compartir.
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs text-neutral-700">
                    <p className="font-semibold text-neutral-900 mb-0.5">Presiona el botón Compartir</p>
                    <p className="flex items-center gap-1 text-neutral-600">
                      Toca el ícono <Share className="w-3.5 h-3.5 text-sky-600 inline" /> en la barra inferior o superior de Safari.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs text-neutral-700">
                    <p className="font-semibold text-neutral-900 mb-0.5">Selecciona "Agregar a inicio"</p>
                    <p className="flex items-center gap-1 text-neutral-600">
                      Desliza hacia abajo y pulsa <PlusSquare className="w-3.5 h-3.5 text-sky-600 inline" /> <strong>"Agregar al inicio"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs text-neutral-700">
                    <p className="font-semibold text-neutral-900 mb-0.5">Confirma pulsando "Agregar"</p>
                    <p className="text-neutral-600">
                      ¡Listo! El ícono de Agenfacil quedará en tu pantalla principal como una app nativa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Android / Chromium / Desktop */
            <div className="space-y-4 text-center">
              <div className="py-2">
                <div className="w-16 h-16 bg-teal-50 text-teal-750 rounded-2xl mx-auto flex items-center justify-center mb-3 border border-teal-100">
                  <Smartphone className="w-8 h-8 text-teal-700" />
                </div>
                <h4 className="text-sm font-bold text-neutral-900">
                  {hasNativePrompt ? 'Instalación en 1 Clic' : 'Instalar en tu Celular'}
                </h4>
                <p className="text-xs text-neutral-600 mt-1 max-w-xs mx-auto">
                  {hasNativePrompt
                    ? 'Al pulsar el botón se abrirá el diálogo del navegador para añadir Agenfacil a tus aplicaciones.'
                    : 'Puedes instalar Agenfacil directamente desde tu navegador móvil en 2 simples pasos.'}
                </p>
              </div>

              {onInstallClick && (
                <button
                  type="button"
                  onClick={() => {
                    onInstallClick();
                    if (hasNativePrompt) {
                      onClose();
                    }
                  }}
                  className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar e Instalar App</span>
                </button>
              )}

              {!hasNativePrompt && (
                <div className="text-left space-y-2.5 pt-2 border-t border-neutral-100">
                  <p className="text-xs font-semibold text-neutral-700">O también desde el menú:</p>
                  <div className="flex items-start gap-2.5 p-2.5 bg-neutral-50 rounded-lg text-xs text-neutral-600">
                    <span className="font-bold text-teal-700">1.</span>
                    <span>Toca los <strong>tres puntos (⋮)</strong> en la esquina superior de Chrome o tu navegador.</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 bg-neutral-50 rounded-lg text-xs text-neutral-600">
                    <span className="font-bold text-teal-700">2.</span>
                    <span>Toca <strong>"Instalar aplicación"</strong> o <strong>"Añadir a la pantalla de inicio"</strong>.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Push notification setup banner inside modal */}
          <div className="border-t border-neutral-100 pt-4">
            <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-xl">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-neutral-900">Notificaciones Push en tu Móvil</h5>
                    {notificationPermission === 'granted' && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <CheckCircle className="w-2.5 h-2.5" /> Activas
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-600 mt-0.5">
                    Recibe avisos inmediatos de turnos nuevos agendados por el bot, confirmaciones y citas finalizadas.
                  </p>
                  {notificationPermission !== 'granted' && (
                    <button
                      onClick={handleEnablePush}
                      className="mt-2.5 w-full py-2 px-3 bg-white hover:bg-sky-50 border border-sky-300 text-sky-700 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                      Activar Alertas Push y Probar Sonido
                    </button>
                  )}
                  {notificationPermission === 'granted' && !pushTested && (
                    <button
                      onClick={async () => {
                        await testBrowserNotification();
                        setPushTested(true);
                      }}
                      className="mt-2 text-[11px] text-sky-700 hover:text-sky-800 font-medium underline"
                    >
                      Enviar notificación de prueba al móvil
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
