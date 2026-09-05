import React from 'react';
import { Sparkles, Lock, ArrowRight, CheckCircle2, Shield, Bot, Stethoscope, Cloud } from 'lucide-react';
import { useAgendaStore } from '../lib/store';

interface ProFeatureGateProps {
  featureTitle: string;
  featureDescription: string;
  icon?: 'bot' | 'soap' | 'google' | 'lock';
  onNavigateToPlans: () => void;
}

export const ProFeatureGate: React.FC<ProFeatureGateProps> = ({
  featureTitle,
  featureDescription,
  icon = 'lock',
  onNavigateToPlans
}) => {
  const { updatePracticeSettings } = useAgendaStore();

  const handleQuickActivatePro = () => {
    updatePracticeSettings({
      subscription_plan: 'pro',
      trial_active: true,
      trial_days_left: 14
    });
  };

  const getIcon = () => {
    switch (icon) {
      case 'bot':
        return <Bot className="w-8 h-8 text-neutral-900" />;
      case 'soap':
        return <Stethoscope className="w-8 h-8 text-neutral-900" />;
      case 'google':
        return <Cloud className="w-8 h-8 text-neutral-900" />;
      default:
        return <Lock className="w-8 h-8 text-neutral-900" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden text-center p-8 sm:p-12">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-6">
          {getIcon()}
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 text-white text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Función Exclusiva • Plan Pro AI</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight font-display mb-3">
          {featureTitle}
        </h2>

        <p className="text-sm sm:text-base text-neutral-600 max-w-xl mx-auto mb-8 leading-relaxed">
          {featureDescription}
        </p>

        {/* Benefits list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left mb-8">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs text-neutral-700">
            <CheckCircle2 className="w-4 h-4 text-neutral-900 shrink-0 mt-0.5" />
            <span>Bot de WhatsApp autónomo 24/7 con IA</span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs text-neutral-700">
            <CheckCircle2 className="w-4 h-4 text-neutral-900 shrink-0 mt-0.5" />
            <span>Dictado por voz y notas SOAP con IA</span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs text-neutral-700">
            <CheckCircle2 className="w-4 h-4 text-neutral-900 shrink-0 mt-0.5" />
            <span>Sincronización en vivo con Google Calendar</span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs text-neutral-700">
            <CheckCircle2 className="w-4 h-4 text-neutral-900 shrink-0 mt-0.5" />
            <span>Reasignación autónoma de lista de espera</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onNavigateToPlans}
            className="w-full sm:w-auto px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Suscribirse a Plan Pro AI</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToPlans}
            className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Ver Planes & Precios</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-400 mt-6 flex items-center justify-center gap-1">
          <Shield className="w-3.5 h-3.5 text-neutral-400" />
          <span>Sin compromisos. Puedes cambiar de plan o cancelar en cualquier momento.</span>
        </p>
      </div>
    </div>
  );
};
