import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  UserCheck,
  DollarSign,
  Clock,
  Phone,
  Globe,
  Share2,
  Check,
  ExternalLink,
  ShieldCheck,
  Bot,
  AlertTriangle,
  HelpCircle,
  Play
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAgendaStore } from '../lib/store';

interface OnboardingGuideViewProps {
  onNavigateToTab: (tab: string) => void;
  onOpenNewAppointment?: () => void;
}

export const OnboardingGuideView: React.FC<OnboardingGuideViewProps> = ({
  onNavigateToTab,
  onOpenNewAppointment
}) => {
  const {
    practiceSettings,
    services,
    availability,
    appointments,
    updatePracticeSettings
  } = useAgendaStore();

  const [copiedLink, setCopiedLink] = useState(false);

  const completedSteps = practiceSettings.onboarding_completed_steps || [];

  // Dynamic status evaluation
  const isProfileComplete = Boolean(
    practiceSettings.practice_name?.trim() &&
    practiceSettings.professional_name?.trim() &&
    practiceSettings.phone?.trim()
  );

  const isServicesComplete = services.some(s => s.active);
  const isHoursComplete = availability.some(d => d.enabled);
  const isBotTested = completedSteps.includes('whatsapp') || appointments.some(a => a.origin === 'bot_whatsapp');
  const isPortalTested = completedSteps.includes('share') || appointments.some(a => (a.origin as string) === 'patient_portal' || a.origin === 'public_booking');

  const guideSteps = [
    {
      id: 'profile',
      number: '01',
      title: 'Datos del Consultorio & Profesional',
      description: 'Configura el nombre de tu centro médico, especialidad, matrícula y teléfono de contacto que verán los pacientes.',
      tab: 'configuracion',
      actionLabel: 'Completar datos',
      icon: UserCheck,
      completed: isProfileComplete,
      essential: true,
      hint: isProfileComplete ? 'Nombre y datos de contacto cargados correctamente' : 'Falta nombre o teléfono de atención'
    },
    {
      id: 'services',
      number: '02',
      title: 'Definir Aranceles & Tratamientos',
      description: 'Carga al menos una consulta o tratamiento con su precio y duración en minutos para habilitar el agendamiento.',
      tab: 'servicios',
      actionLabel: 'Gestionar aranceles',
      icon: DollarSign,
      completed: isServicesComplete,
      essential: true,
      hint: isServicesComplete ? `${services.filter(s => s.active).length} servicio(s) activo(s)` : 'No hay tratamientos cargados aún'
    },
    {
      id: 'hours',
      number: '03',
      title: 'Configurar Horarios de Atención',
      description: 'Establece los días de la semana y las franjas horarias en las que atiendes para que el sistema calcule los turnos disponibles.',
      tab: 'horarios',
      actionLabel: 'Configurar franjas',
      icon: Clock,
      completed: isHoursComplete,
      essential: true,
      hint: isHoursComplete ? 'Días y turnos de atención configurados' : 'Debes activar al menos un día de atención'
    },
    {
      id: 'whatsapp',
      number: '04',
      title: 'Probar el Bot IA de Turnos (Simulador)',
      description: 'Interactúa con el asistente virtual inteligente entrenado con tu agenda real. Coordina turnos y resuelve dudas como lo haría un paciente.',
      tab: 'chats',
      actionLabel: 'Abrir Simulador Bot IA',
      icon: Bot,
      completed: isBotTested,
      essential: false,
      hint: isBotTested ? 'Simulador probado con éxito' : 'Prueba cómo el bot agenda con tu agenda real'
    },
    {
      id: 'share',
      number: '05',
      title: 'Probar Portal Online de Pacientes',
      description: 'Verifica tu página pública agenfacil.com/u/... y realiza un agendamiento de prueba para comprobar el flujo.',
      tab: 'portal',
      actionLabel: 'Ver Portal de Turnos',
      icon: Globe,
      completed: isPortalTested,
      essential: false,
      hint: isPortalTested ? 'Portal verificado y funcional' : 'Prueba el link público para pacientes'
    }
  ];

  const completedCount = guideSteps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / guideSteps.length) * 100);
  const essentialPending = guideSteps.filter(s => s.essential && !s.completed);

  const handleToggleManualStep = (stepId: string) => {
    let updated: string[];
    if (completedSteps.includes(stepId)) {
      updated = completedSteps.filter(s => s !== stepId);
    } else {
      updated = [...completedSteps, stepId];
      if (updated.length === guideSteps.length) {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      }
    }
    updatePracticeSettings({ onboarding_completed_steps: updated });
  };

  const handleCopyPublicLink = () => {
    const url = `${window.location.origin}/#portal`;
    navigator.clipboard?.writeText?.(url);
    setCopiedLink(true);
    if (!completedSteps.includes('share')) {
      handleToggleManualStep('share');
    }
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Title Section */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-neutral-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-neutral-900 font-display tracking-tight">
                  Guía de Puesta en Marcha
                </h1>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                  {completedCount} de {guideSteps.length} completados
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Sigue estos pasos esenciales para dejar tu consultorio 100% operativo y listo para recibir reservas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateToTab('dashboard')}
              className="px-3.5 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            >
              Ir al Panel Principal
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab('portal')}
              className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Probar Portal Online</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-700">
              Progreso de configuración: {progressPercent}%
            </span>
            <span className="text-neutral-500 font-medium">
              {completedCount === guideSteps.length ? '¡Todo listo para agendar!' : `${guideSteps.length - completedCount} paso(s) restante(s)`}
            </span>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-neutral-900 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Warning if essential steps missing */}
        {essentialPending.length > 0 && (
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Atención: </span>
              <span>
                Para que los pacientes puedan solicitar turnos en tu portal público, es indispensable completar:{' '}
                <strong>{essentialPending.map(s => s.title).join(', ')}</strong>.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Steps List Cards */}
      <div className="space-y-3">
        {guideSteps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`p-4 sm:p-5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                step.completed
                  ? 'bg-white/70 border-neutral-200/70 text-neutral-600 shadow-2xs'
                  : 'bg-white border-neutral-200 shadow-2xs hover:border-neutral-400'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <button
                  type="button"
                  onClick={() => handleToggleManualStep(step.id)}
                  className="mt-0.5 text-neutral-400 hover:text-neutral-800 transition-colors shrink-0"
                  title={step.completed ? "Desmarcar paso" : "Marcar como completado"}
                >
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-neutral-300" />
                  )}
                </button>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-neutral-400">
                      PASO {step.number}
                    </span>
                    {step.essential && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700 uppercase font-mono">
                        Esencial
                      </span>
                    )}
                    <h3 className={`text-sm font-bold font-display ${step.completed ? 'text-neutral-600 line-through' : 'text-neutral-900'}`}>
                      {step.title}
                    </h3>
                  </div>

                  <p className="text-xs text-neutral-500 leading-relaxed max-w-2xl">
                    {step.description}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 pt-0.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-300" />
                    <span>{step.hint}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigateToTab(step.tab)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs ${
                    step.completed
                      ? 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                  }`}
                >
                  <span>{step.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trial & Features Clarification Card */}
      <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-200/80 space-y-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-neutral-700" />
          <h3 className="text-sm font-bold text-neutral-900 font-display">
            Tu período de prueba de 14 días (Plan Básico activo)
          </h3>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed">
          Durante el trial cuentas con acceso irrestricto a la <strong>Agenda inteligente</strong>, <strong>Portal público para pacientes</strong>, <strong>Control de caja y señas</strong> y el <strong>Simulador del Bot IA con datos reales</strong>.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 pt-1 text-xs">
          <div className="p-3 bg-white rounded-lg border border-neutral-200">
            <span className="font-bold text-neutral-900 block mb-1">
              ✅ Plan Básico (y Trial):
            </span>
            <ul className="text-[11px] text-neutral-600 space-y-1">
              <li>• Turnos manuales y portal web 24/7</li>
              <li>• Recordatorios de WhatsApp vía enlace directo</li>
              <li>• Fichas médicas completas de pacientes</li>
              <li>• Laboratorio y Simulador del Bot IA con agenda real</li>
            </ul>
          </div>

          <div className="p-3 bg-white rounded-lg border border-neutral-200">
            <span className="font-bold text-neutral-900 block mb-1">
              ⭐ Plan Pro AI:
            </span>
            <ul className="text-[11px] text-neutral-600 space-y-1">
              <li>• Conexión a tu línea real de WhatsApp Business</li>
              <li>• Bot IA atendiendo y agendando 24/7 en tu WhatsApp</li>
              <li>• Dictado por voz de consultas médicas con Gemini</li>
              <li>• Sincronización con Google Calendar y Sheets</li>
            </ul>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => onNavigateToTab('suscripcion')}
            className="text-xs font-semibold text-neutral-900 hover:underline inline-flex items-center gap-1"
          >
            <span>Ver detalles y precios de los planes</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
