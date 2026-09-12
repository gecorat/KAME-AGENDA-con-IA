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
  Award,
  Building2,
  AlertTriangle,
  FileText,
  Send,
  RefreshCw,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAgendaStore } from '../lib/store';
import { SUBSCRIPTION_PLANS, PLAN_COMPARISON_MATRIX } from '../lib/plans';
import { SubscriptionPlanId, BillingCycle, CurrencyCode } from '../types';
import { BankTransferModal } from '../components/subscription/BankTransferModal';

export type SaasGateway = 'lemonsqueezy' | 'mercadopago' | 'transferencia' | 'dlocalgo';

interface SubscriptionPlansViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const SubscriptionPlansView: React.FC<SubscriptionPlansViewProps> = ({ onNavigateTab }) => {
  const { practiceSettings, updatePracticeSettings } = useAgendaStore();

  // Helper to normalize any key representation to SaasGateway
  const toGatewayKey = (key: string): SaasGateway => {
    if (key === 'transfer' || key === 'transferencia' || key === 'bank') return 'transferencia';
    if (key === 'dlocal_go' || key === 'dlocalgo' || key === 'dlocal') return 'dlocalgo';
    if (key === 'mercadopago' || key === 'mp') return 'mercadopago';
    return 'lemonsqueezy';
  };

  const isGatewayActive = (gw: SaasGateway): boolean => {
    switch (gw) {
      case 'mercadopago':
        return practiceSettings.saas_method_mercadopago_enabled !== false;
      case 'lemonsqueezy':
        return (
          practiceSettings.saas_method_lemonsqueezy_enabled !== false &&
          practiceSettings.lemonsqueezy_enabled !== false
        );
      case 'transferencia':
        return (
          practiceSettings.saas_method_transfer_enabled !== false &&
          practiceSettings.saas_bank_enabled !== false
        );
      case 'dlocalgo': {
        if (
          practiceSettings.saas_method_dlocal_enabled === false ||
          practiceSettings.dlocal_go_enabled === false
        ) {
          return false;
        }
        return Boolean(
          practiceSettings.saas_method_dlocal_enabled ||
          practiceSettings.dlocal_go_enabled
        );
      }
      default:
        return true;
    }
  };

  // Build list of all available gateways that are explicitly active
  const allGateways: SaasGateway[] = ['lemonsqueezy', 'mercadopago', 'transferencia', 'dlocalgo'];
  const enabledMethods: SaasGateway[] = allGateways.filter(isGatewayActive);
  const safeEnabledMethods = enabledMethods.length > 0 ? enabledMethods : (['mercadopago', 'transferencia'] as SaasGateway[]);

  const rawPriority = (practiceSettings.saas_methods_priority && practiceSettings.saas_methods_priority.length > 0)
    ? practiceSettings.saas_methods_priority
    : (practiceSettings.saas_payment_methods_priority && practiceSettings.saas_payment_methods_priority.length > 0)
    ? practiceSettings.saas_payment_methods_priority
    : ['mercadopago', 'transfer', 'lemonsqueezy', 'dlocal_go'];

  const priorityOrder: SaasGateway[] = rawPriority.map(toGatewayKey);

  const sortedMethods: SaasGateway[] = [...safeEnabledMethods].sort((a, b) => {
    const idxA = priorityOrder.indexOf(a);
    const idxB = priorityOrder.indexOf(b);
    return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
  });

  const rawPrimary = practiceSettings.saas_primary_payment_method ? toGatewayKey(practiceSettings.saas_primary_payment_method) : sortedMethods[0];
  const primaryMethod: SaasGateway = sortedMethods.includes(rawPrimary) ? rawPrimary : (sortedMethods[0] || 'mercadopago');

  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    practiceSettings.subscription_billing_cycle || 'monthly'
  );
  const [currency, setCurrency] = useState<CurrencyCode>('ARS');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<SubscriptionPlanId>('pro');
  const [selectedGateway, setSelectedGateway] = useState<SaasGateway>(primaryMethod || 'lemonsqueezy');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Modals for simulation / bank transfer
  const [showBankTransferModal, setShowBankTransferModal] = useState(false);
  const [showLemonSimulator, setShowLemonSimulator] = useState(false);
  const [lemonProcessing, setLemonProcessing] = useState(false);
  const [showDlocalSimulator, setShowDlocalSimulator] = useState(false);
  const [dlocalSimMethod, setDlocalSimMethod] = useState<'card' | 'bank' | 'cash'>('card');
  const [dlocalProcessing, setDlocalProcessing] = useState(false);

  // Keep selectedGateway in sync if primaryMethod or active methods change
  React.useEffect(() => {
    if (primaryMethod && sortedMethods.includes(primaryMethod)) {
      setSelectedGateway(primaryMethod);
    } else if (sortedMethods.length > 0) {
      setSelectedGateway(sortedMethods[0]);
    }
  }, [
    primaryMethod,
    practiceSettings.saas_primary_payment_method,
    practiceSettings.saas_method_dlocal_enabled,
    practiceSettings.dlocal_go_enabled,
    practiceSettings.saas_method_mercadopago_enabled,
    practiceSettings.saas_method_lemonsqueezy_enabled,
    practiceSettings.lemonsqueezy_enabled,
    practiceSettings.saas_method_transfer_enabled,
    practiceSettings.saas_bank_enabled,
    practiceSettings.saas_methods_priority
  ]);

  // Check URL on load for DLocal Go, Lemon Squeezy or Mercado Pago redirect return
  React.useEffect(() => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';

    if (hash.includes('dlocal-success') || search.includes('dlocal_status=PAID')) {
      const params = new URLSearchParams(hash.split('?')[1] || search);
      const plan = (params.get('plan') as SubscriptionPlanId) || 'pro';
      const cycle = (params.get('cycle') as BillingCycle) || 'monthly';

      updatePracticeSettings({
        subscription_plan: plan,
        subscription_billing_cycle: cycle,
        trial_active: false,
        subscription_payment_method: 'dlocalgo'
      });

      setSuccessMessage(`¡Pago confirmado con éxito en DLocal Go Checkout Pro! Tu ${plan === 'pro' ? 'Plan Pro AI' : 'Plan Esencial'} ya está activo.`);
      setCheckoutSuccess(true);
      setShowCheckoutModal(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (hash.includes('lemon-success') || search.includes('lemon_status=PAID')) {
      const params = new URLSearchParams(hash.split('?')[1] || search);
      const plan = (params.get('plan') as SubscriptionPlanId) || 'pro';
      const cycle = (params.get('cycle') as BillingCycle) || 'monthly';

      updatePracticeSettings({
        subscription_plan: plan,
        subscription_billing_cycle: cycle,
        trial_active: false,
        subscription_payment_method: 'lemonsqueezy'
      });

      setSuccessMessage(`¡Suscripción recurrente activada con éxito en Lemon Squeezy! Tu ${plan === 'pro' ? 'Plan Pro AI' : 'Plan Esencial'} ya está activo.`);
      setCheckoutSuccess(true);
      setShowCheckoutModal(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [updatePracticeSettings]);

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

  const getGatewayLabel = (id: string) => {
    switch (id) {
      case 'lemonsqueezy': return 'Lemon Squeezy (MoR)';
      case 'mercadopago': return 'Mercado Pago';
      case 'transfer':
      case 'transferencia': return 'Transferencia Bancaria';
      case 'dlocal_go':
      case 'dlocalgo': return 'DLocal Go';
      default: return id;
    }
  };

  const handleSelectPlan = (planId: SubscriptionPlanId, preferredGateway?: SaasGateway) => {
    if (planId === currentPlan && !isTrial) return;
    setSelectedPlanForCheckout(planId);
    if (preferredGateway && sortedMethods.includes(preferredGateway)) {
      setSelectedGateway(preferredGateway);
    } else if (sortedMethods.length > 0) {
      setSelectedGateway(primaryMethod && sortedMethods.includes(primaryMethod) ? primaryMethod : sortedMethods[0]);
    }
    setShowCheckoutModal(true);
  };

  const handleConfirmSubscription = async () => {
    const numericAmount = selectedPlanForCheckout === 'pro'
      ? (billingCycle === 'monthly' ? (currency === 'ARS' ? 49000 : 49) : (currency === 'ARS' ? 499000 : 499))
      : (billingCycle === 'monthly' ? (currency === 'ARS' ? 29000 : 29) : (currency === 'ARS' ? 299000 : 299));

    // Bank Transfer flow
    if (selectedGateway === 'transferencia') {
      setShowCheckoutModal(false);
      setShowBankTransferModal(true);
      return;
    }

    setIsProcessing(true);

    // Lemon Squeezy flow
    if (selectedGateway === 'lemonsqueezy') {
      try {
        const res = await fetch('/api/lemonsqueezy/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: selectedPlanForCheckout,
            planName: selectedPlanForCheckout === 'pro' ? 'Plan Pro AI' : 'Plan Esencial',
            billingCycle: billingCycle,
            amount: numericAmount,
            currency: currency,
            userEmail: practiceSettings.email || 'gonzalocorat@gmail.com',
            userName: practiceSettings.professional_name || 'Doctor Agenfacil',
            apiKey: practiceSettings.lemonsqueezy_api_key,
            storeId: practiceSettings.lemonsqueezy_store_id,
            variantId: selectedPlanForCheckout === 'pro'
              ? practiceSettings.lemonsqueezy_variant_id_pro
              : practiceSettings.lemonsqueezy_variant_id_basic
          })
        });
        const data = await res.json();
        setIsProcessing(false);

        if (data.success) {
          if (data.simulated || !practiceSettings.lemonsqueezy_api_key) {
            setShowCheckoutModal(false);
            setShowLemonSimulator(true);
          } else if (data.redirect_url || data.checkout_url) {
            window.location.href = data.redirect_url || data.checkout_url;
          }
        } else {
          setShowCheckoutModal(false);
          setShowLemonSimulator(true);
        }
      } catch (err) {
        console.error('Error creating Lemon Squeezy checkout:', err);
        setIsProcessing(false);
        setShowCheckoutModal(false);
        setShowLemonSimulator(true);
      }
      return;
    }

    // DLocal Go flow
    if (selectedGateway === 'dlocalgo') {
      try {
        const res = await fetch('/api/dlocalgo/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: selectedPlanForCheckout,
            planName: selectedPlanForCheckout === 'pro' ? 'Plan Pro AI' : 'Plan Esencial',
            billingCycle: billingCycle,
            amount: numericAmount,
            currency: currency,
            userEmail: practiceSettings.email || 'gonzalocorat@gmail.com',
            apiKey: practiceSettings.dlocal_go_api_key,
            secretKey: practiceSettings.dlocal_go_secret_key
          })
        });
        const data = await res.json();
        setIsProcessing(false);

        if (data.success) {
          if (data.simulated || !practiceSettings.dlocal_go_api_key) {
            setShowCheckoutModal(false);
            setShowDlocalSimulator(true);
          } else if (data.redirect_url) {
            window.location.href = data.redirect_url;
          }
        } else {
          setShowCheckoutModal(false);
          setShowDlocalSimulator(true);
        }
      } catch (err) {
        console.error('Error creating DLocal Go checkout:', err);
        setIsProcessing(false);
        setShowCheckoutModal(false);
        setShowDlocalSimulator(true);
      }
      return;
    }

    // Mercado Pago flow (default / fallback)
    setTimeout(() => {
      updatePracticeSettings({
        subscription_plan: selectedPlanForCheckout,
        subscription_billing_cycle: billingCycle,
        trial_active: false,
        subscription_payment_method: 'mercadopago'
      });
      setIsProcessing(false);
      setSuccessMessage('¡Suscripción confirmada y activada mediante Mercado Pago!');
      setCheckoutSuccess(true);
      confetti({ particleCount: 50, spread: 60 });
      setTimeout(() => {
        setCheckoutSuccess(false);
        setShowCheckoutModal(false);
      }, 2000);
    }, 1200);
  };

  const handleCompleteLemonSimulation = () => {
    setLemonProcessing(true);
    setTimeout(() => {
      updatePracticeSettings({
        subscription_plan: selectedPlanForCheckout,
        subscription_billing_cycle: billingCycle,
        trial_active: false,
        subscription_payment_method: 'lemonsqueezy'
      });
      setLemonProcessing(false);
      setShowLemonSimulator(false);
      setSuccessMessage('¡Suscripción recurrente aprobada con Lemon Squeezy! Tu nuevo plan está 100% activo.');
      setCheckoutSuccess(true);
      confetti({ particleCount: 60, spread: 70 });
      setTimeout(() => {
        setCheckoutSuccess(false);
      }, 3500);
    }, 1500);
  };

  const handleCompleteDlocalSimulation = () => {
    setDlocalProcessing(true);
    setTimeout(() => {
      updatePracticeSettings({
        subscription_plan: selectedPlanForCheckout,
        subscription_billing_cycle: billingCycle,
        trial_active: false,
        subscription_payment_method: 'dlocalgo'
      });
      setDlocalProcessing(false);
      setShowDlocalSimulator(false);
      setSuccessMessage('¡Pago aprobado en DLocal Go Checkout Pro! Redirigiendo automáticamente a tu nuevo plan...');
      setCheckoutSuccess(true);
      confetti({ particleCount: 60, spread: 70 });
      setTimeout(() => {
        setCheckoutSuccess(false);
      }, 3500);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Plan Status Banner */}
      <div className="bg-white border border-neutral-200/90 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-neutral-900 font-display">
                {currentPlan === 'pro' ? 'Plan Pro AI Activo' : 'Plan Básico Activo'}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Suscripción Pagada
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {currentPlan === 'pro'
                ? 'Tienes acceso ilimitado a todas las herramientas: Bot de WhatsApp con IA, consultas médicas personalizadas, notas de voz, recetas y portal de reservas.'
                : 'Acceso a gestión de turnos y recordatorios automáticos. Puedes actualizar a Pro AI en cualquier momento.'}
            </p>
          </div>
        </div>

        {currentPlan !== 'pro' && (
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleSelectPlan('pro')}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
            >
              <span>Subir a Pro AI</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* SaaS Migration Notice Banner */}
      {Boolean(practiceSettings.saas_migration_notice_enabled || practiceSettings.saas_migration_notice_active) && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-xs flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-black text-amber-950">
                Aviso de Actualización de Pasarela de Pagos
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                Tu suscripción actual sigue activa sin cortes
              </span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              {practiceSettings.saas_migration_notice_message || practiceSettings.saas_migration_notice_text || (
                <>
                  Estamos optimizando los medios de cobro de Agenfacil hacia <strong>{getGatewayLabel(toGatewayKey(practiceSettings.saas_migration_notice_target_method || practiceSettings.saas_migration_target_method || 'lemonsqueezy'))}</strong>. Si ya eres cliente recurrente, <strong>tu suscripción actual no se cancela</strong> y continúa cobrándose por el medio que elegiste. Te invitamos a adherirte a la nueva pasarela oficial para contar con los últimos beneficios.
                </>
              )}
            </p>
            {practiceSettings.saas_migration_deadline && (
              <p className="text-[11px] text-amber-800 font-semibold pt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Fecha límite sugerida de migración: <strong>{practiceSettings.saas_migration_deadline}</strong></span>
              </p>
            )}
            <div className="pt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const targetMethod = toGatewayKey(practiceSettings.saas_migration_notice_target_method || practiceSettings.saas_migration_target_method || 'lemonsqueezy');
                  setSelectedGateway(targetMethod);
                  handleSelectPlan(currentPlan === 'trial' ? 'pro' : (currentPlan as SubscriptionPlanId), targetMethod);
                }}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Migrar a {getGatewayLabel(toGatewayKey(practiceSettings.saas_migration_notice_target_method || practiceSettings.saas_migration_target_method || 'lemonsqueezy'))}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
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

              {/* Direct payment methods selection (Primary method + secondary alternatives) */}
              {(!isCurrent || isTrial) && sortedMethods.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                    <span>Método prioritario: <strong className="text-neutral-700">{getGatewayLabel(primaryMethod)}</strong></span>
                  </div>
                  {sortedMethods.length > 1 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {sortedMethods.filter(m => m !== primaryMethod).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSelectPlan(plan.id, m)}
                          className="text-[10px] font-bold text-sky-800 hover:text-sky-950 bg-sky-50 hover:bg-sky-100/80 px-2 py-0.5 rounded-md border border-sky-100 transition cursor-pointer flex items-center gap-1"
                        >
                          <span>Pagar con {getGatewayLabel(m)}</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-700 block">
                      Selecciona la Pasarela de Pago:
                    </label>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      Configurado por Super Admin
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {sortedMethods.map((methodKey) => {
                      const isSelected = selectedGateway === methodKey;
                      const isPrimary = primaryMethod === methodKey;

                      if (methodKey === 'lemonsqueezy') {
                        return (
                          <div
                            key={methodKey}
                            onClick={() => setSelectedGateway('lemonsqueezy')}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-1 ring-amber-400/30'
                                : 'border-neutral-200 bg-white hover:bg-neutral-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-amber-400 text-neutral-950 font-black text-xs flex items-center justify-center shadow-2xs">
                                🍋
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-neutral-900 block">
                                    Lemon Squeezy
                                  </span>
                                  {isPrimary && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-200 text-amber-900">
                                      Principal
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-neutral-100 text-neutral-700">
                                    Débito Recurrente Internacional
                                  </span>
                                </div>
                                <span className="text-[11px] text-neutral-500 block mt-0.5">
                                  Tarjetas de crédito/débito locales e internacionales sin fricción (Merchant of Record)
                                </span>
                              </div>
                            </div>
                            <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-amber-600 bg-amber-600' : 'border-neutral-300'
                            }`}>
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                          </div>
                        );
                      }

                      if (methodKey === 'mercadopago') {
                        return (
                          <div
                            key={methodKey}
                            onClick={() => setSelectedGateway('mercadopago')}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'border-sky-500 bg-sky-50/70 shadow-xs ring-1 ring-sky-400/30'
                                : 'border-neutral-200 bg-white hover:bg-neutral-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-sky-500 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                                MP
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-neutral-900 block">
                                    Mercado Pago Suscripciones
                                  </span>
                                  {isPrimary && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-sky-200 text-sky-900">
                                      Principal
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-neutral-500 block mt-0.5">
                                  Dinero en cuenta Mercado Pago o tarjetas bancarias argentinas
                                </span>
                              </div>
                            </div>
                            <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-sky-600 bg-sky-600' : 'border-neutral-300'
                            }`}>
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                          </div>
                        );
                      }

                      if (methodKey === 'transferencia') {
                        return (
                          <div
                            key={methodKey}
                            onClick={() => setSelectedGateway('transferencia')}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-400/30'
                                : 'border-neutral-200 bg-white hover:bg-neutral-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-neutral-900 block">
                                    Transferencia Bancaria Directa
                                  </span>
                                  {isPrimary && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-200 text-emerald-900">
                                      Principal
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                    CBU / Alias
                                  </span>
                                </div>
                                <span className="text-[11px] text-neutral-500 block mt-0.5">
                                  Transferencia directa a cuenta oficial, subes tu comprobante y el Super Admin lo valida
                                </span>
                              </div>
                            </div>
                            <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-neutral-300'
                            }`}>
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                          </div>
                        );
                      }

                      if (methodKey === 'dlocalgo') {
                        return (
                          <div
                            key={methodKey}
                            onClick={() => setSelectedGateway('dlocalgo')}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                                : 'border-neutral-200 bg-white hover:bg-neutral-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                                DL
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-neutral-900 block">
                                    DLocal Go (Checkout Pro)
                                  </span>
                                  {isPrimary && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                      Principal
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-neutral-500 block mt-0.5">
                                  Tarjetas locales/internacionales y retorno automático
                                </span>
                              </div>
                            </div>
                            <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-amber-600 bg-amber-600' : 'border-neutral-300'
                            }`}>
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>

                {/* Gateway credentials / instructions alert */}
                {selectedGateway === 'lemonsqueezy' && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Lemon Squeezy Checkout
                      </span>
                      {practiceSettings.lemonsqueezy_api_key ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Conectado en Vivo
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full">
                          Modo Simulación Integrado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      {practiceSettings.lemonsqueezy_api_key
                        ? 'Se iniciará el checkout oficial de Lemon Squeezy con soporte para suscripciones automáticas recurrentes.'
                        : 'Puedes ingresar tus credenciales en el Super Admin o probar la experiencia interactiva con el simulador de Lemon Squeezy.'}
                    </p>
                  </div>
                )}

                {selectedGateway === 'transferencia' && (
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                        Datos Bancarios Oficiales
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded-full">
                        Revisión Super Admin
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Al presionar el botón inferior se desplegarán el CBU, Alias y CUIT de la cuenta, permitiéndote ingresar el número de comprobante y adjuntar el archivo para aprobación inmediata.
                    </p>
                  </div>
                )}

                {selectedGateway === 'dlocalgo' && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-amber-700" />
                        Credenciales DLocal Go
                      </span>
                      {practiceSettings.dlocal_go_api_key ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> API Key Lista
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full">
                          Sandbox / Directo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      {practiceSettings.dlocal_go_api_key
                        ? 'Tus credenciales de DLocal Go están configuradas para procesar los cobros con redirección automática.'
                        : 'Puedes registrar tu API Key y Secret en la sección de APIs & Pasarelas, o continuar para probar el flujo de redirección con el simulador integrado.'}
                    </p>
                  </div>
                )}

                {/* Action CTA */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleConfirmSubscription}
                    disabled={isProcessing}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-extrabold text-white shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      selectedGateway === 'lemonsqueezy'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : selectedGateway === 'transferencia'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : selectedGateway === 'dlocalgo'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-sky-600 hover:bg-sky-700'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Conectando con {getGatewayLabel(selectedGateway)}...</span>
                      </>
                    ) : (
                      <>
                        {selectedGateway === 'transferencia' ? (
                          <>
                            <Building2 className="w-4 h-4" />
                            <span>Continuar a Carga de Comprobante de Transferencia</span>
                          </>
                        ) : selectedGateway === 'lemonsqueezy' ? (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Pagar con Lemon Squeezy</span>
                          </>
                        ) : selectedGateway === 'dlocalgo' ? (
                          <>
                            <Globe className="w-4 h-4" />
                            <span>Pagar con DLocal Go Checkout Pro</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            <span>Pagar con Mercado Pago Suscripciones</span>
                          </>
                        )}
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCheckoutModal(false)}
                    className="w-full py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <div className="pt-2 text-[10px] text-center text-neutral-400">
                    Al suscribirte aceptas nuestros{' '}
                    <button
                      type="button"
                      onClick={() => onNavigateTab?.('terminos')}
                      className="underline hover:text-neutral-700 cursor-pointer font-medium"
                    >
                      Términos y Condiciones
                    </button>
                    {' '}y{' '}
                    <button
                      type="button"
                      onClick={() => onNavigateTab?.('privacidad')}
                      className="underline hover:text-neutral-700 cursor-pointer font-medium"
                    >
                      Política de Privacidad
                    </button>.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DLOCAL GO CHECKOUT PRO SIMULATOR / REDIRECT EXPERIENCE */}
      {showDlocalSimulator && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
            
            {/* DLocal Go Top Header */}
            <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-neutral-950 font-black text-sm flex items-center justify-center shadow-xs">
                  d
                </div>
                <div>
                  <h4 className="text-xs font-extrabold tracking-wide uppercase font-mono text-amber-400">
                    dLocal Go Checkout Pro
                  </h4>
                  <p className="text-[10px] text-neutral-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Pasarela Segura Encriptada SSL 256-bit
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDlocalSimulator(false)}
                className="text-neutral-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Details */}
            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                    Concepto de Pago
                  </span>
                  <span className="text-xs font-bold text-neutral-900 block mt-0.5">
                    {selectedPlanForCheckout === 'pro' ? 'KAME Agenda AI - Plan Pro AI' : 'KAME Agenda AI - Plan Esencial'}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {billingCycle === 'monthly' ? 'Facturación Mensual Recurrente' : 'Facturación Anual'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                    Total
                  </span>
                  <span className="text-base font-black font-mono text-amber-900">
                    {selectedPlanForCheckout === 'pro'
                      ? billingCycle === 'monthly'
                        ? currency === 'ARS' ? '$49.000 ARS' : '$49 USD'
                        : currency === 'ARS' ? '$499.000 ARS' : '$499 USD'
                      : billingCycle === 'monthly'
                        ? currency === 'ARS' ? '$29.000 ARS' : '$29 USD'
                        : currency === 'ARS' ? '$299.000 ARS' : '$299 USD'}
                  </span>
                </div>
              </div>

              {/* Payment Methods tabs */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-800 block">
                  Medio de Pago Seleccionado:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDlocalSimMethod('card')}
                    className={`p-2.5 rounded-xl border text-center transition text-xs font-bold cursor-pointer ${
                      dlocalSimMethod === 'card'
                        ? 'border-amber-600 bg-amber-50 text-amber-950 ring-1 ring-amber-500/20'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mx-auto mb-1 text-amber-700" />
                    <span>Tarjeta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDlocalSimMethod('bank')}
                    className={`p-2.5 rounded-xl border text-center transition text-xs font-bold cursor-pointer ${
                      dlocalSimMethod === 'bank'
                        ? 'border-amber-600 bg-amber-50 text-amber-950 ring-1 ring-amber-500/20'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 mx-auto mb-1 text-amber-700" />
                    <span>Transferencia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDlocalSimMethod('cash')}
                    className={`p-2.5 rounded-xl border text-center transition text-xs font-bold cursor-pointer ${
                      dlocalSimMethod === 'cash'
                        ? 'border-amber-600 bg-amber-50 text-amber-950 ring-1 ring-amber-500/20'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <Globe className="w-4 h-4 mx-auto mb-1 text-amber-700" />
                    <span>Efectivo Local</span>
                  </button>
                </div>
              </div>

              {/* Card Inputs Simulation */}
              {dlocalSimMethod === 'card' && (
                <div className="space-y-2.5 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
                      Número de Tarjeta (Visa, Mastercard, Cabal):
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="•••• •••• •••• 4242 (Checkout Pro Test)"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg font-mono text-neutral-800"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
                        Vencimiento:
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="12/28"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg font-mono text-neutral-800"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
                        CVV:
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="•••"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg font-mono text-neutral-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Redirection note */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Redirección automática configurada:</strong> Una vez aprobado el cobro, DLocal Go confirmará la transacción y volverás directamente a tu consultorio con el plan activado.
                </p>
              </div>

              {/* Action Button */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleCompleteDlocalSimulation}
                  disabled={dlocalProcessing}
                  className="w-full py-3 px-4 rounded-xl text-xs font-extrabold text-neutral-950 bg-amber-400 hover:bg-amber-500 shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {dlocalProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                      <span>Procesando pago en DLocal Go...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirmar Pago en DLocal Go</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDlocalSimulator(false)}
                  className="w-full py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* LEMON SQUEEZY CHECKOUT / SIMULATOR EXPERIENCE */}
      {showLemonSimulator && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Top Bar */}
            <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-neutral-950 font-black text-sm flex items-center justify-center shadow-xs">
                  🍋
                </div>
                <div>
                  <h4 className="text-xs font-extrabold tracking-wide uppercase font-mono text-amber-300">
                    Lemon Squeezy Checkout
                  </h4>
                  <p className="text-[10px] text-neutral-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Merchant of Record &bull; Débito Automático
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLemonSimulator(false)}
                className="text-neutral-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order summary */}
            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                    Plan Seleccionado
                  </span>
                  <span className="text-xs font-bold text-neutral-900 block mt-0.5">
                    {selectedPlanForCheckout === 'pro' ? 'Agenfacil AI - Plan Pro AI' : 'Agenfacil - Plan Esencial'}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {billingCycle === 'monthly' ? 'Cobro Mensual Recurrente' : 'Cobro Anual Recurrente'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                    Total a Cobrar
                  </span>
                  <span className="text-base font-black font-mono text-amber-900">
                    {selectedPlanForCheckout === 'pro'
                      ? billingCycle === 'monthly'
                        ? currency === 'ARS' ? '$49.000 ARS' : '$49 USD'
                        : currency === 'ARS' ? '$499.000 ARS' : '$499 USD'
                      : billingCycle === 'monthly'
                        ? currency === 'ARS' ? '$29.000 ARS' : '$29 USD'
                        : currency === 'ARS' ? '$299.000 ARS' : '$299 USD'}
                  </span>
                </div>
              </div>

              {/* Card Inputs */}
              <div className="space-y-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800">
                    Tarjeta para Suscripción Automática:
                  </label>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                    Lemon Squeezy MoR
                  </span>
                </div>
                <div>
                  <input
                    type="text"
                    readOnly
                    value="•••• •••• •••• 4242 (Lemon Squeezy Test)"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg font-mono text-neutral-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-neutral-500 block mb-0.5">
                      Vencimiento:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="12/28"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg font-mono text-neutral-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-neutral-500 block mb-0.5">
                      CVC / CVV:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="888"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg font-mono text-neutral-800"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-xl text-xs text-neutral-700 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Cobro automático programado:</strong> Tu tarjeta quedará adherida de forma segura al débito automático con Lemon Squeezy para renovar tu plan cada {billingCycle === 'monthly' ? 'mes' : 'año'}. Podrás cancelar cuando gustes sin penalizaciones.
                </p>
              </div>

              {/* Action Button */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleCompleteLemonSimulation}
                  disabled={lemonProcessing}
                  className="w-full py-3 px-4 rounded-xl text-xs font-extrabold text-neutral-950 bg-amber-400 hover:bg-amber-500 shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {lemonProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                      <span>Adhiriendo tarjeta y activando plan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Activar Suscripción en Lemon Squeezy</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowLemonSimulator(false)}
                  className="w-full py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BANK TRANSFER MODAL */}
      <BankTransferModal
        isOpen={showBankTransferModal}
        onClose={() => setShowBankTransferModal(false)}
        planId={selectedPlanForCheckout}
        billingCycle={billingCycle}
        amount={
          selectedPlanForCheckout === 'pro'
            ? (billingCycle === 'monthly' ? (currency === 'ARS' ? 49000 : 49) : (currency === 'ARS' ? 499000 : 499))
            : (billingCycle === 'monthly' ? (currency === 'ARS' ? 29000 : 29) : (currency === 'ARS' ? 299000 : 299))
        }
      />
    </div>
  );
};
