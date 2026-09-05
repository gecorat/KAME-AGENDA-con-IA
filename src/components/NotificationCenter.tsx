import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  BellRing,
  CheckCheck,
  Check,
  Calendar,
  X,
  Volume2,
  VolumeX,
  ExternalLink,
  Bot,
  UserCheck,
  Sparkles,
  Info,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Filter
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { AppNotification } from '../types';

interface NotificationCenterProps {
  onSelectTab: (tabId: string) => void;
  onOpenAppointment?: (appointmentId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onSelectTab,
  onOpenAppointment
}) => {
  const {
    notifications,
    appointments,
    unreadNotificationsCount,
    notificationPermission,
    requestBrowserNotificationPermission,
    testBrowserNotification,
    markNotificationAsRead,
    markNotificationAsUnread,
    markAllNotificationsAsRead,
    deleteNotification,
    clearReadNotifications,
    clearNotifications,
    activeToastNotification,
    dismissToastNotification,
    practiceSettings,
    updatePracticeSettings
  } = useAgendaStore();

  const [isOpen, setIsOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (notif: AppNotification) => {
    markNotificationAsRead(notif.id);
    setIsOpen(false);
    onSelectTab('agenda');
    if (notif.appointment_id && onOpenAppointment) {
      onOpenAppointment(notif.appointment_id);
    }
  };

  const handleEnableNotifications = async () => {
    await requestBrowserNotificationPermission();
  };

  const toggleSound = () => {
    updatePracticeSettings({
      notify_sound_enabled: !(practiceSettings.notify_sound_enabled !== false)
    });
  };

  const isSoundActive = practiceSettings.notify_sound_enabled !== false;
  const isBrowserNotifGranted = notificationPermission === 'granted';

  const readCount = notifications.filter(n => n.read).length;
  const displayedNotifications = filterTab === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <>
      {/* Floating In-App Toast Banner - Responsive on all screen sizes */}
      {activeToastNotification && (
        <div className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-4 sm:top-4 z-50 sm:max-w-md w-auto animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="bg-neutral-900 text-white rounded-2xl shadow-xl border border-neutral-700/80 p-3.5 sm:p-4 relative overflow-hidden">
            {/* Top accent line */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${
              activeToastNotification.type === 'bot_booking'
                ? 'bg-sky-400'
                : activeToastNotification.type === 'patient_confirm'
                ? 'bg-emerald-400'
                : 'bg-amber-400'
            }`} />

            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                activeToastNotification.type === 'bot_booking'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : activeToastNotification.type === 'patient_confirm'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {activeToastNotification.type === 'bot_booking' ? (
                  <Bot className="w-5 h-5" />
                ) : activeToastNotification.type === 'patient_confirm' ? (
                  <UserCheck className="w-5 h-5" />
                ) : (
                  <BellRing className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    activeToastNotification.type === 'bot_booking'
                      ? 'bg-sky-950 text-sky-300 border border-sky-800'
                      : activeToastNotification.type === 'patient_confirm'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {activeToastNotification.type === 'bot_booking'
                      ? 'Bot de WhatsApp'
                      : activeToastNotification.type === 'patient_confirm'
                      ? 'Paciente Confirmó'
                      : 'Notificación'}
                  </span>
                  <span className="text-[11px] text-neutral-400">Ahora</span>
                </div>

                <h4 className="text-sm font-bold text-neutral-100 mt-1 font-display leading-snug break-words">
                  {activeToastNotification.title}
                </h4>

                <p className="text-xs text-neutral-300 mt-1 leading-relaxed break-words">
                  {activeToastNotification.message}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      dismissToastNotification();
                      onSelectTab('agenda');
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Ver en Agenda</span>
                  </button>

                  <button
                    type="button"
                    onClick={dismissToastNotification}
                    className="px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
                  >
                    Descartar
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={dismissToastNotification}
                className="absolute top-3 right-3 p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                title="Cerrar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop on mobile when notification drawer is open */}
      {isOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-neutral-950/30 backdrop-blur-2xs z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Header Bell Trigger & Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          id="btn-header-notifications"
          onClick={() => setIsOpen(prev => !prev)}
          className={`relative p-2 rounded-xl border transition-all ${
            isOpen
              ? 'bg-neutral-100 text-neutral-900 border-neutral-300'
              : 'bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 border-neutral-200'
          }`}
          title="Notificaciones y alertas del consultorio"
          aria-label="Abrir centro de notificaciones"
        >
          {unreadNotificationsCount > 0 ? (
            <BellRing className="w-4 h-4 text-sky-600 animate-pulse" />
          ) : (
            <Bell className="w-4 h-4" />
          )}

          {/* Unread Counter Badge - Only shown if there are pending unread notifications */}
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* Dropdown Panel - Properly framed for all screen sizes & mobile */}
        {isOpen && (
          <div className="fixed inset-x-3 top-16 sm:inset-x-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-96 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-neutral-200 z-50 overflow-hidden animate-in fade-in duration-150 flex flex-col max-h-[85vh] sm:max-h-[32rem]">
            {/* Header */}
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-neutral-800" />
                <h3 className="text-xs font-bold text-neutral-900 font-display">
                  Alertas del Consultorio
                </h3>
                {unreadNotificationsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                    {unreadNotificationsCount} nuevas
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`p-1.5 rounded-lg border text-xs transition-colors ${
                    isSoundActive
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : 'bg-neutral-100 text-neutral-400 border-neutral-200'
                  }`}
                  title={isSoundActive ? 'Sonido de alertas activado' : 'Sonido silenciado'}
                >
                  {isSoundActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                {unreadNotificationsCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsAsRead}
                    className="p-1.5 text-neutral-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors text-xs flex items-center gap-1"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}

                {readCount > 0 && (
                  <button
                    type="button"
                    onClick={clearReadNotifications}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs"
                    title="Quitar leídas (se conservan turnos pendientes)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs & Quick Action Bar */}
            <div className="px-3 py-1.5 bg-neutral-100/70 border-b border-neutral-100 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    filterTab === 'all'
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Todas ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('unread')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    filterTab === 'unread'
                      ? 'bg-white text-sky-700 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  No leídas ({unreadNotificationsCount})
                </button>
              </div>

              {notifications.length > 0 && (
                <div className="flex items-center gap-2">
                  {readCount > 0 && (
                    <button
                      type="button"
                      onClick={clearReadNotifications}
                      className="text-[10px] font-medium text-neutral-500 hover:text-rose-600 transition-colors"
                      title="Limpia notificaciones ya leídas, preservando turnos que aún no sucedieron"
                    >
                      Limpiar leídas
                    </button>
                  )}
                  {unreadNotificationsCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotificationsAsRead}
                      className="text-[10px] font-semibold text-sky-700 hover:underline"
                    >
                      Leer todas
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Browser Permission Banner */}
            <div className="p-3 border-b border-neutral-100 bg-neutral-50/50 shrink-0">
              {isBrowserNotifGranted ? (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Notificaciones de escritorio activas</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => testBrowserNotification()}
                    className="px-2 py-1 text-[11px] font-semibold text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors shadow-2xs whitespace-nowrap"
                  >
                    Probar
                  </button>
                </div>
              ) : notificationPermission === 'denied' ? (
                <div className="flex items-start gap-2 text-xs text-rose-800 bg-rose-50/60 p-2 rounded-xl border border-rose-200">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block">Notificaciones bloqueadas</span>
                    <span className="text-[11px] text-rose-700 leading-tight block">
                      Haz clic en el ícono del candado en la barra de URL del navegador y permite las Notificaciones.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 text-xs bg-sky-50/80 p-2 rounded-xl border border-sky-200/80">
                  <div className="flex items-center gap-1.5 text-sky-900 font-medium">
                    <BellRing className="w-4 h-4 shrink-0 text-sky-600" />
                    <span>Activar avisos de escritorio</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleEnableNotifications}
                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-2xs whitespace-nowrap"
                  >
                    Permitir
                  </button>
                </div>
              )}
            </div>

            {/* Notification Feed List */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
              {displayedNotifications.length === 0 ? (
                <div className="p-6 text-center text-neutral-400 space-y-1">
                  <Bell className="w-6 h-6 mx-auto stroke-1 text-neutral-300" />
                  <p className="text-xs font-semibold text-neutral-600">
                    {filterTab === 'unread' ? 'No tienes notificaciones sin leer' : 'Sin notificaciones pendientes'}
                  </p>
                  <p className="text-[11px] text-neutral-400 leading-tight">
                    {filterTab === 'unread'
                      ? 'Has revisado todas tus alertas.'
                      : 'Te avisaremos automáticamente cuando el Bot de WhatsApp agende un turno o un paciente confirme asistencia.'}
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => testBrowserNotification()}
                      className="text-xs font-semibold text-sky-600 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Simular notificación de prueba</span>
                    </button>
                  </div>
                </div>
              ) : (
                displayedNotifications.map(notif => {
                  // Determine if this notification is for an upcoming appointment
                  const aptObj = notif.appointment_id ? appointments.find(a => a.id === notif.appointment_id) : null;
                  const aptDatetimeStr = aptObj?.start_datetime || notif.datetime;
                  const isUpcomingApt = aptDatetimeStr ? new Date(aptDatetimeStr).getTime() > Date.now() - 1000 * 60 * 60 * 2 : false;

                  return (
                    <div
                      key={notif.id}
                      className={`p-3 text-xs flex items-start gap-2.5 transition-colors group relative ${
                        !notif.read ? 'bg-sky-50/40 hover:bg-sky-50/70' : 'bg-white hover:bg-neutral-50'
                      }`}
                    >
                      {/* Icon */}
                      <div
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-2 rounded-xl shrink-0 mt-0.5 cursor-pointer ${
                          notif.type === 'bot_booking'
                            ? 'bg-sky-100 text-sky-700'
                            : notif.type === 'patient_confirm'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {notif.type === 'bot_booking' ? (
                          <Bot className="w-4 h-4" />
                        ) : notif.type === 'patient_confirm' ? (
                          <UserCheck className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                      </div>

                      {/* Content */}
                      <div
                        onClick={() => handleNotificationClick(notif)}
                        className="flex-1 min-w-0 cursor-pointer pr-14"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-neutral-900 truncate">
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-neutral-600 text-[11px] mt-0.5 leading-snug line-clamp-2">
                          {notif.message}
                        </p>

                        {/* Badges / Status */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {isUpcomingApt && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 text-[10px] font-semibold">
                              <Calendar className="w-2.5 h-2.5" />
                              <span>Turno por atender</span>
                            </span>
                          )}

                          <span className="text-[10px] text-sky-600 font-semibold flex items-center gap-0.5">
                            <span>Ver en Agenda</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>

                          {!notif.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-600 shrink-0" />
                          )}
                        </div>
                      </div>

                      {/* Quick action buttons on individual notification */}
                      <div className="absolute top-2.5 right-2 flex items-center gap-1">
                        {/* Mark as read/unread button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (notif.read) {
                              markNotificationAsUnread(notif.id);
                            } else {
                              markNotificationAsRead(notif.id);
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            notif.read
                              ? 'text-neutral-400 hover:text-sky-600 hover:bg-neutral-100'
                              : 'text-sky-600 hover:text-sky-700 hover:bg-sky-100'
                          }`}
                          title={notif.read ? 'Marcar como no leída' : 'Marcar como leída'}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete notification button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Quitar esta notificación"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-2.5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-[11px] shrink-0">
                <button
                  type="button"
                  onClick={clearNotifications}
                  className="text-neutral-400 hover:text-rose-600 transition-colors"
                >
                  Limpiar todo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onSelectTab('configuracion');
                  }}
                  className="font-semibold text-neutral-700 hover:text-neutral-900 transition-colors"
                >
                  Configuración de alertas →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
