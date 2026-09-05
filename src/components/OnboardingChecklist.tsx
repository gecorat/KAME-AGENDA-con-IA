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
  ChevronDown,
  ChevronUp,
  X,
  Share2,
  Check
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';

interface OnboardingChecklistProps {
  onNavigateToTab: (tab: string) => void;
  onOpenNewService?: () => void;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  onNavigateToTab,
}) => {
  const { practiceSettings, services, availability, updatePracticeSettings } = useAgendaStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const completedSteps = practiceSettings.onboarding_completed_steps || ['profile', 'services', 'hours'];

  // Check status dynamically
  const isProfileComplete = Boolean(
    practiceSettings.practice_name &&
    practiceSettings.professional_name &&
    practiceSettings.phone
  );

  const isServicesComplete = services.some(s => s.active);
  const isHoursComplete = availability.some(d => d.enabled);
  const isWhatsAppConnected = Boolean(practiceSettings.whatsapp_connected);
  const isShareComplete = completedSteps.includes('share');

  const steps = [
    {
      id: 'profile',
      title: 'Datos del Consultorio & Profesional',
      description: 'Nombre, especialidad, matrícula y teléfono de contacto para tus pacientes.',
      tab: 'configuracion',
      actionLabel: 'Completar perfil',
      icon: UserCheck,
      completed: isProfileComplete
    },
    {
      id: 'services',
      title: 'Definir Aranceles & Tratamientos',
      description: 'Configura al menos un servicio con precio y duración para que los pacientes puedan elegirlo.',
      tab: 'servicios',
      actionLabel: 'Gestionar aranceles',
      icon: DollarSign,
      completed: isServicesComplete
    },
    {
      id: 'hours',
      title: 'Configurar Horarios de Atención',
      description: 'Establece tus días y franjas de atención laboral para habilitar turnos disponibles.',
      tab: 'horarios',
      actionLabel: 'Ajustar horarios',
      icon: Clock,
      completed: isHoursComplete
    },
    {
      id: 'whatsapp',
      title: 'Conectar WhatsApp Business',
      description: 'Vincula tu número o escanea el QR para enviar confirmaciones y activar el bot de turnos.',
      tab: 'chats',
      actionLabel: 'Vincular WhatsApp',
      icon: Phone,
      completed: isWhatsAppConnected
    },
    {
      id: 'share',
      title: 'Probar y Compartir Enlace Público',
      description: 'Verifica tu portal en agendapro.ai/u/... y compártelo en tu perfil de Instagram o WhatsApp.',
      tab: 'portal',
      actionLabel: 'Ver Portal',
      icon: Globe,
      completed: isShareComplete
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  const handleToggleManualStep = (stepId: string) => {
    let updated: string[];
    if (completedSteps.includes(stepId)) {
      updated = completedSteps.filter(s => s !== stepId);
    } else {
      updated = [...completedSteps, stepId];
    }
    updatePracticeSettings({ onboarding_completed_steps: updated });
  };

  const handleCopyPublicLink = () => {
    const handle = practiceSettings.handle || 'consultorio-medico';
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/u/${handle}`
      : `https://agendapro.ai/u/${handle}`;
    navigator.clipboard?.writeText?.(url);
    setCopiedLink(true);
    if (!completedSteps.includes('share')) {
      handleToggleManualStep('share');
    }
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // If all completed and user minimized, show subtle badge
  if (completedCount === steps.length && isCollapsed) {
    return (
      <div className="bg-white border border-neutral-200/80 rounded-xl p-3 flex items-center justify-between text-xs shadow-2xs">
        <div className="flex items-center gap-2 text-neutral-800 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Consultorio 100% configurado y listo para recibir reservas</span>
        </div>
        <button
          onClick={() => setIsCollapsed(false)}
          className="text-neutral-500 hover:text-neutral-800 text-[11px] underline"
        >
          Ver pasos
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200/80 rounded-xl shadow-2xs overflow-hidden transition-all">
      {/* Header */}
      <div className="p-4 bg-neutral-50/50 border-b border-neutral-200/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-neutral-900 font-display">
                Pasos para activar tu sistema de agendamiento
              </h3>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-neutral-200/80 text-neutral-700">
                {completedCount}/{steps.length} completados
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Completa estos 5 pasos básicos para que tu consultorio esté 100% listo para agendar pacientes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg border border-neutral-200 hover:bg-white text-neutral-600 transition-colors"
            title={isCollapsed ? "Expandir pasos" : "Minimizar pasos"}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-neutral-100 h-1.5">
        <div
          className="bg-neutral-900 h-1.5 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                    step.completed
                      ? 'bg-neutral-50/50 border-neutral-200/60 text-neutral-600'
                      : 'bg-white border-neutral-200 hover:border-neutral-400 text-neutral-900 shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-neutral-400 font-mono">
                          0{idx + 1}
                        </span>
                        <div className={`p-1 rounded ${step.completed ? 'text-neutral-500 bg-neutral-100' : 'text-neutral-900 bg-neutral-100'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleManualStep(step.id)}
                        className="text-neutral-400 hover:text-neutral-800 transition-colors"
                        title={step.completed ? "Marcar como pendiente" : "Marcar como completado"}
                      >
                        {step.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-neutral-300" />
                        )}
                      </button>
                    </div>

                    <h4 className={`text-xs font-semibold mb-1 line-clamp-1 ${step.completed ? 'text-neutral-700 line-through' : 'text-neutral-900'}`}>
                      {step.title}
                    </h4>
                    <p className="text-[11px] text-neutral-500 leading-tight line-clamp-2">
                      {step.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onNavigateToTab(step.tab)}
                      className="text-[11px] font-medium text-neutral-800 hover:text-neutral-950 inline-flex items-center gap-1 hover:underline"
                    >
                      <span>{step.actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick share action footer */}
          <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-neutral-600">
            <div className="flex items-center gap-2">
              <span className="font-medium text-neutral-800">Enlace de tu consultorio:</span>
              <code className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-[11px] border border-neutral-200">
                agendapro.ai/u/{practiceSettings.handle || 'consultorio'}
              </code>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyPublicLink}
                className="px-3 py-1 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-md text-neutral-800 font-medium text-xs transition-colors flex items-center gap-1.5"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-neutral-500" />}
                <span>{copiedLink ? '¡Enlace copiado!' : 'Copiar enlace para pacientes'}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateToTab('portal')}
                className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md font-medium text-xs transition-colors flex items-center gap-1"
              >
                <span>Probar Portal Online</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
