import React, { useState } from 'react';
import {
  Check,
  X,
  Sparkles,
  Zap,
  CreditCard,
  ShieldCheck,
  HelpCircle,
  TrendingUp,
  ArrowRight,
  Bot,
  Calendar,
  Mic,
  DollarSign,
  MessageSquare,
  Globe,
  Award
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { SUBSCRIPTION_PLANS, PLAN_COMPARISON_MATRIX } from '../lib/plans';
import { SubscriptionPlanId, BillingCycle, CurrencyCode } from '../types';

export const SubscriptionPlansView: React.FC = () => {
  const { practiceSettings, updatePracticeSettings } = useAgendaStore();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    practiceSettings.subscription_billing_cycle || 'monthly'
  );
  const [currency, setCurrency] = useState<CurrencyCode>('ARS');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<SubscriptionPlanId>('pro');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentPlan = practiceSettings.subscription_plan || 'trial';
  const isTrial = currentPlan === 'trial' || Boolean(practiceSettings.trial_active);
  const trialDaysLeft = practiceSettings.trial_days_left ?? 14;

  const formatPrice = (plan: typeof SUBSCRIPTION_PLANS[0]) => {
    if (currency === 'ARS') {
      const amount = billingCycle === 'monthly' ? plan.priceMonthARS : plan.priceAnnualARS;
      return `$${amount.toLocaleString('es-AR')}`;
    } else {
      const amount = billingCycle === 'monthly' ? plan.priceMonthUSD : plan.priceAnnualUSD;
      return `$${amount.toLocaleString('en-US')} USD`;
    }
  };

  const handleSelectPlan = (planId: SubscriptionPlanId) => {
    if (planId === currentPlan && !isTrial) return;
    setSelectedPlanForCheckout(planId);
    setShowCheckoutModal(true);
  };

  const handleConfirmSubscription = () => {
    setIsProcessing(true);
    setTimeout(() => {
      updatePracticeSettings({
        subscription_plan: selectedPlanForCheckout,
        subscription_billing_cycle: billingCycle,
        trial_active: false
      });
      setIsProcessing(false);
      setCheckoutSuccess(true);
      setTimeout(() => {
        setCheckoutSuccess(false);
        setShowCheckoutModal(false);
      }, 2000);
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 14-Day Trial Status Notification Banner */}
      {isTrial && (
        <div className="bg-white border border-neutral-200/90 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900 font-display">
                  Prueba Gratuita de 14 Días Activa (Plan Pro AI Completo)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {trialDaysLeft} días restantes
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Tienes acceso total a todas las herramientas del <strong>Plan Pro AI</strong> (bot autónomo de WhatsApp, historias clínicas con IA y voz, agenda interactiva y portal de turnos).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleSelectPlan('basic')}
              className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg transition-colors"
            >
              Confirmar Básico
            </button>
            <button
              type="button"
              onClick={() => handleSelectPlan('pro')}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
            >
              <span>Subir a Pro AI</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
          <Award className="w-3.5 h-3.5 text-neutral-500" />
          <span>Planes transparentes para profesionales y consultorios</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight font-display">
          Elige el plan para tu consultorio
        </h1>
        <p className="text-xs text-neutral-500 max-w-xl mx-auto leading-relaxed">
          Automatiza reservas, recordatorios y fichas clínicas. Sin contratos forzosos ni comisiones por turno.
        </p>

        {/* Plan & Currency Switchers */}
        <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
          {/* Billing cycle toggle */}
          <div className="inline-flex items-center p-1 bg-neutral-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Facturación Mensual
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span>Pago Anual</span>
              <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-md bg-emerald-100 text-emerald-800">
                2 Meses Gratis
              </span>
            </button>
          </div>

          {/* Currency Switcher */}
          <div className="inline-flex items-center p-1 bg-neutral-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => setCurrency('ARS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                currency === 'ARS'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              🇦🇷 ARS ($) • Mercado Pago
            </button>
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                currency === 'USD'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              🌎 USD ($) • Exterior / Stripe
            </button>
          </div>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
        {SUBSCRIPTION_PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id;
          const isPro = plan.id === 'pro';

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl p-6 sm:p-7 flex flex-col transition-all duration-200 ${
                isPro
                  ? 'bg-white border-2 border-neutral-900 shadow-sm'
                  : 'bg-white border border-neutral-200/80 shadow-2xs hover:border-neutral-300'
              }`}
            >
              {/* Badge for Popular/Recommended */}
              {isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] font-mono font-bold px-3 py-0.5 rounded uppercase tracking-wider shadow-2xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Más Elegido • Automatización Total</span>
                </div>
              )}

              {/* Card Header */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-400 font-mono">
                    {plan.badge}
                  </span>
                  {isCurrent && !isTrial && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900 text-white flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Plan Activo
                    </span>
                  )}
                  {isTrial && plan.id === 'basic' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Activo en tu Trial
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-neutral-900 font-display">
                  {plan.name}
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed min-h-[36px]">
                  {plan.tagline}
                </p>
              </div>

              {/* Price display */}
              <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200/70 mb-5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight font-display">
                    {formatPrice(plan)}
                  </span>
                  <span className="text-xs font-semibold text-neutral-500">
                    {billingCycle === 'monthly' ? '/ mes' : '/ año'}
                  </span>
                </div>

                {billingCycle === 'annual' && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    {currency === 'ARS'
                      ? `Equivale a $${Math.round(plan.priceAnnualARS / 12).toLocaleString('es-AR')}/mes`
                      : `Equivale a $${Math.round(plan.priceAnnualUSD / 12)} USD/mes`}
                  </p>
                )}
              </div>

              {/* Features List */}
              <div className="space-y-2.5 flex-1 mb-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
                  Funciones incluidas:
                </p>
                <ul className="space-y-2">
                  {plan.features.map((feat, idx) => (
                    <li
                      key={idx}
                      className={`flex items-start gap-2 text-xs ${
                        feat.included
                          ? feat.highlight
                            ? 'text-neutral-900 font-semibold'
                            : 'text-neutral-700'
                          : 'text-neutral-400 line-through'
                      }`}
                    >
                      {feat.included ? (
                        <div
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                            feat.highlight
                              ? 'bg-neutral-900 text-white'
                              : 'bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded bg-neutral-100 text-neutral-400 flex items-center justify-center shrink-0 mt-0.5">
                          <X className="w-2.5 h-2.5" />
                        </div>
                      )}
                      <span>{feat.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isCurrent && !isTrial}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-all shadow-2xs flex items-center justify-center gap-2 ${
                  isCurrent && !isTrial
                    ? 'bg-neutral-100 text-neutral-400 cursor-default border border-neutral-200'
                    : isPro
                    ? 'bg-neutral-900 hover:bg-neutral-800 text-white'
                    : 'bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-200'
                }`}
              >
                {isTrial ? (
                  isPro ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Mejorar a Plan Pro AI</span>
                    </>
                  ) : (
                    <span>Contratar Plan Esencial</span>
                  )
                ) : isCurrent ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tu Plan Activo</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>
                      {isPro ? 'Mejorar a Plan Pro AI' : 'Seleccionar Plan Esencial'}
                    </span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-neutral-400 mt-2 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
                <span>Cancela o cambia de plan en cualquier momento</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* ROI & Value Highlight Banner */}
      <div className="bg-gradient-to-br from-sky-900 via-sky-800 to-teal-900 rounded-2xl p-6 sm:p-8 text-white shadow-md">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur-xs border border-white/20">
            <TrendingUp className="w-3.5 h-3.5 text-teal-300" />
            <span>Retorno de Inversión Inmediato (ROI)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            ¿Por qué el Plan Pro AI se paga solo desde el primer mes?
          </h2>
          <p className="text-xs sm:text-sm text-sky-100 leading-relaxed">
            En un consultorio médico u odontológico promedio, un 20% a 30% de los pacientes se ausentan o cancelan a último momento.
            Con el <strong>cobro de seña con Mercado Pago</strong> y los <strong>recordatorios autónomos de WhatsApp</strong>,
            eliminas los huecos en la agenda.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs">
              <span className="text-lg font-black text-teal-300 block">1 Solo Turno</span>
              <span className="text-[11px] text-sky-100">
                Salvas 1 consulta particular al mes y el costo del software queda 100% amortizado.
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs">
              <span className="text-lg font-black text-teal-300 block">10+ Horas Libres</span>
              <span className="text-[11px] text-sky-100">
                La IA responde WhatsApp a las 11 de la noche y transcribe las historias clínicas por voz.
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs">
              <span className="text-lg font-black text-teal-300 block">0 Fricción</span>
              <span className="text-[11px] text-sky-100">
                Sincronización en tiempo real con tu Google Calendar y tus planillas de Google Sheets.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Feature Comparison Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-neutral-200 bg-neutral-50/70">
          <h3 className="text-base font-extrabold text-neutral-900">
            Comparativa detallada de características
          </h3>
          <p className="text-xs text-neutral-500">
            Revisa exactamente qué incluye cada plan para tomar la mejor decisión para tu práctica.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-100/50">
                <th className="p-3.5 font-bold text-neutral-700 w-1/2">Módulo / Funcionalidad</th>
                <th className="p-3.5 font-bold text-neutral-700 text-center w-1/4">
                  Plan Esencial <br />
                  <span className="font-normal text-[11px] text-neutral-500">$29.000 ARS</span>
                </th>
                <th className="p-3.5 font-bold text-sky-800 text-center w-1/4 bg-sky-50/60">
                  Plan Pro AI <br />
                  <span className="font-normal text-[11px] text-sky-600">$49.000 ARS</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {PLAN_COMPARISON_MATRIX.map((row, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-neutral-50 transition-colors ${
                    row.highlight ? 'bg-sky-50/20' : ''
                  }`}
                >
                  <td className="p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                      {row.category}
                    </span>
                    <span className={`font-semibold ${row.highlight ? 'text-neutral-900' : 'text-neutral-700'}`}>
                      {row.feature}
                    </span>
                  </td>

                  {/* Basic */}
                  <td className="p-3.5 text-center">
                    {typeof row.basic === 'boolean' ? (
                      row.basic ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-neutral-300 mx-auto" />
                      )
                    ) : (
                      <span className="text-neutral-600 font-medium">{row.basic}</span>
                    )}
                  </td>

                  {/* Pro */}
                  <td className="p-3.5 text-center bg-sky-50/30">
                    {typeof row.pro === 'boolean' ? (
                      row.pro ? (
                        <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center mx-auto shadow-2xs">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <X className="w-4 h-4 text-neutral-300 mx-auto" />
                      )
                    ) : (
                      <span className="font-bold text-sky-800">{row.pro}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-7 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="w-5 h-5 text-sky-600" />
          <h3 className="text-base font-extrabold text-neutral-900">
            Preguntas Frecuentes sobre la Suscripción
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1.5">
            <h4 className="font-bold text-neutral-900">
              ¿Cómo funciona el pago con Mercado Pago?
            </h4>
            <p className="text-neutral-600 leading-relaxed">
              En Argentina puedes pagar mediante suscripción de débito automático mensual (tarjeta de crédito o débito) o abonar el plan anual con transferencia bancaria directa (CVU/Alias).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1.5">
            <h4 className="font-bold text-neutral-900">
              ¿Puedo cobrar en dólares si atiendo pacientes del exterior?
            </h4>
            <p className="text-neutral-600 leading-relaxed">
              Sí. El Plan Pro AI te permite vincular Stripe o PayPal además de Mercado Pago para cobrar consultas internacionales y telemedicina a pacientes de cualquier país.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1.5">
            <h4 className="font-bold text-neutral-900">
              ¿Puedo cambiar de plan o cancelar cuando quiera?
            </h4>
            <p className="text-neutral-600 leading-relaxed">
              Absolutamente. No hay contratos de permanencia. Puedes pasar de Esencial a Pro o cancelar en cualquier momento con 1 clic sin penalizaciones.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1.5">
            <h4 className="font-bold text-neutral-900">
              ¿Mis datos médicos e historias clínicas están seguros?
            </h4>
            <p className="text-neutral-600 leading-relaxed">
              Toda la información viaja cifrada bajo protocolos de seguridad médica y secreto profesional. Tus datos te pertenecen y puedes exportar tus historias clínicas en cualquier momento.
            </p>
          </div>
        </div>
      </div>

      {/* Checkout Modal Simulation */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            {checkoutSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <h3 className="text-lg font-extrabold text-neutral-900">
                  ¡Plan activado con éxito!
                </h3>
                <p className="text-xs text-neutral-600">
                  Tu consultorio ahora cuenta con todos los beneficios de{' '}
                  <strong className="text-sky-700">
                    {selectedPlanForCheckout === 'pro' ? 'Plan Pro AI' : 'Plan Esencial'}
                  </strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-black text-xs">
                      MP
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-neutral-900">
                        Confirmar Suscripción
                      </h4>
                      <p className="text-[11px] text-neutral-500">
                        {selectedPlanForCheckout === 'pro' ? 'Plan Pro AI' : 'Plan Esencial'} •{' '}
                        {billingCycle === 'monthly' ? 'Mensual' : 'Anual'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCheckoutModal(false)}
                    className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Summary box */}
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-neutral-700">
                    <span>Plan:</span>
                    <span className="text-neutral-900 font-bold">
                      {selectedPlanForCheckout === 'pro' ? 'Plan Pro AI' : 'Plan Esencial'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-neutral-700">
                    <span>Ciclo de cobro:</span>
                    <span className="text-neutral-900">
                      {billingCycle === 'monthly' ? 'Mensual recurrente' : 'Anual (2 meses bonificados)'}
                    </span>
                  </div>
                  <div className="border-t border-neutral-200 pt-2 flex justify-between text-sm font-black text-neutral-900">
                    <span>Total a abonar:</span>
                    <span className="text-sky-700 font-extrabold">
                      {selectedPlanForCheckout === 'pro'
                        ? billingCycle === 'monthly'
                          ? currency === 'ARS' ? '$49.000 ARS / mes' : '$49 USD / mes'
                          : currency === 'ARS' ? '$499.000 ARS / año' : '$499 USD / año'
                        : billingCycle === 'monthly'
                          ? currency === 'ARS' ? '$29.000 ARS / mes' : '$29 USD / mes'
                          : currency === 'ARS' ? '$299.000 ARS / año' : '$299 USD / año'}
                    </span>
                  </div>
                </div>

                {/* Payment method selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-700 block">
                    Método de Pago:
                  </label>
                  <div className="p-3 rounded-xl border-2 border-sky-500 bg-sky-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-sky-700" />
                      <div>
                        <span className="text-xs font-bold text-neutral-900 block">
                          Mercado Pago Suscripciones
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          Tarjeta de crédito, débito o dinero en cuenta
                        </span>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-sky-600" />
                  </div>
                </div>

                {/* Action CTA */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleConfirmSubscription}
                    disabled={isProcessing}
                    className="w-full py-3 px-4 rounded-xl text-xs font-extrabold text-white bg-sky-600 hover:bg-sky-700 shadow-xs flex items-center justify-center gap-2 transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Conectando con Mercado Pago...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Confirmar y Activar Plan</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCheckoutModal(false)}
                    className="w-full py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
