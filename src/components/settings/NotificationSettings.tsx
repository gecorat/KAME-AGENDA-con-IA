import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Bot,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Play,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAgendaStore } from '../../lib/store';
import { playNotificationSound } from '../../lib/browser-notifications';

export const NotificationSettings: React.FC = () => {
  const {
    practiceSettings,
    updatePracticeSettings,
    notificationPermission,
    requestBrowserNotificationPermission,
    triggerNotification
  } = useAgendaStore();

  const [testSent, setTestSent] = useState<string | null>(null);

  const isGranted = notificationPermission === 'granted';
  const isDenied = notificationPermission === 'denied';

  const handleToggle = (field: keyof typeof practiceSettings, value: boolean) => {
    updatePracticeSettings({ [field]: value });
  };

  const handleRequestPermission = async () => {
    const result = await requestBrowserNotificationPermission();
    if (result === 'granted') {
      setTestSent('¡Permiso concedido exitosamente!');
      setTimeout(() => setTestSent(null), 3000);
    }
  };

  const handleTestBot = () => {
    triggerNotification({
      type: 'bot_booking',
      title: '🤖 ¡Nuevo turno agendado por el Bot!',
      message: 'Martina Benítez ha agendado "Consulta Odontológica Inicial" para el próximo Martes a las 10:30 hs.',
      patient_name: 'Martina Benítez',
      service_name: 'Consulta Odontológica Inicial',
      datetime: new Date().toISOString(),
      force: true
    });
    setTestSent('Se envió la alerta de turno por Bot');
    setTimeout(() => setTestSent(null), 3000);
  };

  const handleTestConfirm = () => {
    triggerNotification({
      type: 'patient_confirm',
      title: '✅ Turno confirmado por paciente',
      message: 'Lucas Gómez confirmó su asistencia para "Limpieza y Profilaxis" de mañana a las 15:00 hs.',
      patient_name: 'Lucas Gómez',
      service_name: 'Limpieza y Profilaxis',
      datetime: new Date().toISOString(),
      force: true
    });
    setTestSent('Se envió la alerta de confirmación');
    setTimeout(() => setTestSent(null), 3000);
  };

  const handleTestSound = () => {
    playNotificationSound();
    setTestSent('Reproduciendo sonido de campana');
    setTimeout(() => setTestSent(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Status */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isGranted
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          : isDenied
          ? 'bg-rose-50/70 border-rose-200 text-rose-950'
          : 'bg-sky-50/70 border-sky-200 text-sky-950'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
              isGranted
                ? 'bg-emerald-100 text-emerald-700'
                : isDenied
                ? 'bg-rose-100 text-rose-700'
                : 'bg-sky-100 text-sky-700'
            }`}>
              {isGranted ? (
                <ShieldCheck className="w-6 h-6" />
              ) : isDenied ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <BellRing className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold font-display">
                  {isGranted
                    ? 'Notificaciones de Escritorio Autorizadas'
                    : isDenied
                    ? 'Notificaciones Bloqueadas en tu Navegador'
                    : 'Notificaciones del Navegador Pendientes'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                  isGranted
                    ? 'bg-emerald-200/80 text-emerald-900'
                    : isDenied
                    ? 'bg-rose-200/80 text-rose-900'
                    : 'bg-sky-200/80 text-sky-900'
                }`}>
                  {notificationPermission}
                </span>
              </div>

              <p className="text-xs text-neutral-600 mt-1 leading-relaxed max-w-xl">
                {isGranted
                  ? 'Tu navegador mostrará alertas nativas en pantalla cuando el Bot de WhatsApp reserve turnos o los pacientes confirmen su cita, incluso si estás en otra pestaña.'
                  : isDenied
                  ? 'El navegador tiene bloqueadas las notificaciones para este sitio. Haz clic en el ícono del candado (o ajustes de sitio) a la izquierda de la barra de direcciones y cambia "Notificaciones" a "Permitir".'
                  : 'Para recibir avisos en tiempo real sobre turnos agendados por el bot o confirmados por pacientes, haz clic en Permitir en el cuadro de diálogo del navegador.'}
              </p>
            </div>
          </div>

          {!isGranted && !isDenied && (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap self-end sm:self-auto"
            >
              <BellRing className="w-4 h-4" />
              <span>Habilitar Notificaciones</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-neutral-700" />
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
              Canales y Eventos de Alerta
            </h3>
          </div>
          {testSent && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{testSent}</span>
            </span>
          )}
        </div>

        {/* Toggles List */}
        <div className="space-y-4">
          {/* Toggle 1: Browser Notifications */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-neutral-50/60 border border-neutral-200/80">
            <div className="space-y-0.5">
              <label className="text-xs font-bold text-neutral-900 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-sky-600" />
                <span>Notificaciones Nativas del Navegador (Desktop Push)</span>
              </label>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Muestra alertas flotantes del sistema operativo cuando se produzcan eventos importantes.
              </p>
            </div>
            <input
              type="checkbox"
              id="toggle-browser-notif"
              checked={practiceSettings.notify_browser_enabled !== false}
              onChange={(e) => handleToggle('notify_browser_enabled', e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-sky-600 focus:ring-sky-500 shrink-0 mt-1 cursor-pointer"
            />
          </div>

          {/* Toggle 2: Bot Bookings */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-neutral-50/60 border border-neutral-200/80">
            <div className="space-y-0.5">
              <label className="text-xs font-bold text-neutral-900 flex items-center gap-2">
                <Bot className="w-4 h-4 text-sky-600" />
                <span>Alertar ante nuevos turnos agendados por el Bot IA</span>
              </label>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Recibe un aviso instantáneo en el momento exacto en que la asistente virtual de WhatsApp concreta una reserva con un paciente.
              </p>
            </div>
            <input
              type="checkbox"
              id="toggle-bot-booking-notif"
              checked={practiceSettings.notify_bot_bookings !== false}
              onChange={(e) => handleToggle('notify_bot_bookings', e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-sky-600 focus:ring-sky-500 shrink-0 mt-1 cursor-pointer"
            />
          </div>

          {/* Toggle 3: Patient Confirmations */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-neutral-50/60 border border-neutral-200/80">
            <div className="space-y-0.5">
              <label className="text-xs font-bold text-neutral-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Alertar ante turnos confirmados por pacientes</span>
              </label>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Te avisa cuando un paciente responde al recordatorio de WhatsApp o confirma su turno a través del enlace web.
              </p>
            </div>
            <input
              type="checkbox"
              id="toggle-patient-confirm-notif"
              checked={practiceSettings.notify_patient_confirmations !== false}
              onChange={(e) => handleToggle('notify_patient_confirmations', e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-sky-600 focus:ring-sky-500 shrink-0 mt-1 cursor-pointer"
            />
          </div>

          {/* Toggle 4: Sound Chime */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-neutral-50/60 border border-neutral-200/80">
            <div className="space-y-0.5">
              <label className="text-xs font-bold text-neutral-900 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-600" />
                <span>Sonido acústico armónico (Chime Web Audio)</span>
              </label>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Reproduce un tono doble suave y agradable de confirmación al recibir una notificación.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={handleTestSound}
                className="px-2 py-1 bg-white hover:bg-neutral-100 text-neutral-700 text-[11px] font-semibold rounded-lg border border-neutral-200 shadow-2xs flex items-center gap-1 transition-colors"
                title="Escuchar tono de prueba"
              >
                <Play className="w-3 h-3" />
                <span>Escuchar</span>
              </button>
              <input
                type="checkbox"
                id="toggle-sound-notif"
                checked={practiceSettings.notify_sound_enabled !== false}
                onChange={(e) => handleToggle('notify_sound_enabled', e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-sky-600 focus:ring-sky-500 shrink-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Simulator / Test Triggers Card */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
            Simulador de Pruebas en Vivo
          </h3>
        </div>

        <p className="text-xs text-neutral-500">
          Usa estos botones para verificar de inmediato el comportamiento de las alertas sonoras, el toast visual y las notificaciones de escritorio en tu equipo:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleTestBot}
            className="p-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-left transition-all group flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-sky-100 text-sky-700 shrink-0 group-hover:scale-105 transition-transform">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-800 block">
                Simular Turno Agendado por Bot
              </span>
              <span className="text-[11px] text-neutral-500 leading-tight block mt-0.5">
                Emite notificación de WhatsApp con datos de paciente y servicio
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={handleTestConfirm}
            className="p-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-left transition-all group flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 group-hover:scale-105 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-800 block">
                Simular Turno Confirmado
              </span>
              <span className="text-[11px] text-neutral-500 leading-tight block mt-0.5">
                Emite notificación de confirmación de asistencia del paciente
              </span>
            </div>
          </button>
        </div>

        <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/70 text-xs text-neutral-500 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-neutral-700">
            <HelpCircle className="w-3.5 h-3.5 text-neutral-500" />
            <span>Consejo para el consultorio</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Para no perderte ninguna notificación durante la jornada de atención, recomendamos fijar la pestaña de Agenfacil en tu navegador o mantenerla abierta en segundo plano.
          </p>
        </div>
      </div>
    </div>
  );
};
