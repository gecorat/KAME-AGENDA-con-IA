import React, { useState } from 'react';
import {
  CreditCard,
  Building2,
  Globe,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  Info,
  Layers,
  Sparkles,
  Sliders,
  Send,
  HelpCircle,
  Calendar,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PracticeSettings } from '../../types';
import { useAgendaStore } from '../../lib/store';

interface SaasPaymentOrchestratorProps {
  formData: PracticeSettings;
  handleChange: (field: keyof PracticeSettings, value: any) => void;
}

type PaymentMethodKey = 'mercadopago' | 'lemonsqueezy' | 'dlocal_go' | 'transfer';

interface MethodMeta {
  key: PaymentMethodKey;
  label: string;
  tag: string;
  tagColor: string;
  desc: string;
  icon: any;
  enabledField: keyof PracticeSettings;
}

const ALL_METHODS: MethodMeta[] = [
  {
    key: 'mercadopago',
    label: 'Mercado Pago (Suscripciones & Débito)',
    tag: 'Nacional (AR)',
    tagColor: 'bg-sky-100 text-sky-800 border-sky-200',
    desc: 'Débito automático mensual recurrente con dinero en cuenta de Mercado Pago o tarjetas bancarias argentinas.',
    icon: CreditCard,
    enabledField: 'saas_method_mercadopago_enabled'
  },
  {
    key: 'lemonsqueezy',
    label: 'Lemon Squeezy (Merchant of Record)',
    tag: 'Global & Recurrente',
    tagColor: 'bg-amber-100 text-amber-900 border-amber-200',
    desc: 'Suscripciones globales automáticas, retención fiscal integrada, tarjetas internacionales e impuestos manejados como Merchant of Record.',
    icon: Sparkles,
    enabledField: 'saas_method_lemonsqueezy_enabled'
  },
  {
    key: 'transfer',
    label: 'Transferencia Bancaria Directa',
    tag: '0% Comisión',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    desc: 'El médico transfiere directamente a tu CBU o Alias y adjunta comprobante para aprobación manual con fechas y vencimientos.',
    icon: Building2,
    enabledField: 'saas_method_transfer_enabled'
  },
  {
    key: 'dlocal_go',
    label: 'DLocal Go (Checkout Pro)',
    tag: 'Latam & Global',
    tagColor: 'bg-purple-100 text-purple-800 border-purple-200',
    desc: 'Checkout Pro con múltiples métodos de pago locales por país en Latinoamérica.',
    icon: Globe,
    enabledField: 'saas_method_dlocal_enabled'
  }
];

export const SaasPaymentOrchestrator: React.FC<SaasPaymentOrchestratorProps> = ({
  formData,
  handleChange
}) => {
  const { triggerNotification, updatePracticeSettings, saasTenants } = useAgendaStore();
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);

  const currentPriority = (formData.saas_methods_priority && formData.saas_methods_priority.length > 0)
    ? formData.saas_methods_priority
    : (['mercadopago', 'transfer', 'lemonsqueezy', 'dlocal_go'] as PaymentMethodKey[]);

  const isEnabled = (key: PaymentMethodKey): boolean => {
    switch (key) {
      case 'mercadopago':
        return formData.saas_method_mercadopago_enabled !== false;
      case 'lemonsqueezy':
        return formData.saas_method_lemonsqueezy_enabled !== false && formData.lemonsqueezy_enabled !== false;
      case 'transfer':
        return formData.saas_method_transfer_enabled !== false && formData.saas_bank_enabled !== false;
      case 'dlocal_go': {
        if (formData.saas_method_dlocal_enabled === false || formData.dlocal_go_enabled === false) {
          return false;
        }
        return Boolean(formData.saas_method_dlocal_enabled || formData.dlocal_go_enabled);
      }
      default:
        return true;
    }
  };

  const primaryMethod = formData.saas_primary_payment_method || currentPriority.find(k => isEnabled(k)) || 'mercadopago';

  const movePriority = (index: number, direction: 'up' | 'down') => {
    const newPriority = [...currentPriority];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPriority.length) return;

    const [moved] = newPriority.splice(index, 1);
    newPriority.splice(targetIndex, 0, moved);

    handleChange('saas_methods_priority', newPriority);
    handleChange('saas_payment_methods_priority', newPriority);

    // Persist immediately
    updatePracticeSettings({
      saas_methods_priority: newPriority,
      saas_payment_methods_priority: newPriority
    });
    triggerNotification('Orden de prioridad de pagos actualizado.');
  };

  const handleSetPrimary = (methodKey: PaymentMethodKey) => {
    const meta = ALL_METHODS.find(m => m.key === methodKey);
    handleChange('saas_primary_payment_method', methodKey);
    updatePracticeSettings({ saas_primary_payment_method: methodKey });
    triggerNotification(`${meta?.label || methodKey} establecido como método principal.`);
  };

  const toggleMethodEnabled = (key: PaymentMethodKey) => {
    const meta = ALL_METHODS.find(m => m.key === key);
    if (!meta) return;
    const current = isEnabled(key);
    const nextState = !current;

    const updates: Partial<PracticeSettings> = {
      [meta.enabledField]: nextState
    };

    if (key === 'dlocal_go') {
      updates.saas_method_dlocal_enabled = nextState;
      updates.dlocal_go_enabled = nextState;
    } else if (key === 'transfer') {
      updates.saas_method_transfer_enabled = nextState;
      updates.saas_bank_enabled = nextState;
    } else if (key === 'lemonsqueezy') {
      updates.saas_method_lemonsqueezy_enabled = nextState;
      updates.lemonsqueezy_enabled = nextState;
    } else if (key === 'mercadopago') {
      updates.saas_method_mercadopago_enabled = nextState;
    }

    // If disabling the current primary method, automatically select next enabled method
    if (!nextState && primaryMethod === key) {
      const nextActive = currentPriority.find(k => k !== key && (k === key ? false : isEnabled(k)));
      if (nextActive) {
        updates.saas_primary_payment_method = nextActive;
        handleChange('saas_primary_payment_method', nextActive);
      }
    }

    // Apply each to form data
    Object.entries(updates).forEach(([field, val]) => {
      handleChange(field as keyof PracticeSettings, val);
    });

    // Auto-save immediately to Firestore & store
    updatePracticeSettings(updates);
    triggerNotification(
      nextState
        ? `Método ${meta.label} habilitado correctamente.`
        : `Método ${meta.label} deshabilitado.`
    );
  };

  const affectedMethods = formData.saas_migration_affected_methods || ['mercadopago'];
  const toggleAffectedMethod = (methodKey: PaymentMethodKey) => {
    const exists = affectedMethods.includes(methodKey);
    const updated = exists
      ? affectedMethods.filter(k => k !== methodKey)
      : [...affectedMethods, methodKey];
    handleChange('saas_migration_affected_methods', updated);
  };

  const isMigrationActive = Boolean(formData.saas_migration_notice_enabled || formData.saas_migration_notice_active);

  const handleToggleMigrationActive = (active: boolean) => {
    handleChange('saas_migration_notice_enabled', active);
    handleChange('saas_migration_notice_active', active);
  };

  const handleBroadcastMigrationNotice = () => {
    setBroadcasting(true);
    const nowIso = new Date().toISOString();
    const noticeText = formData.saas_migration_notice_message || formData.saas_migration_notice_text || 'Estamos actualizando nuestros medios de pago para ofrecer mayor estabilidad y débito automático. Tu servicio continúa activo sin interrupciones, pero te invitamos a adherirte al nuevo método preferente.';
    const targetMethodKey = formData.saas_migration_notice_target_method || formData.saas_migration_target_method || 'lemonsqueezy';
    const targetLabel = ALL_METHODS.find(m => m.key === targetMethodKey)?.label.split('(')[0] || 'Lemon Squeezy';

    // 1. Enable notice and record timestamp
    handleToggleMigrationActive(true);
    handleChange('saas_migration_last_sent_at', nowIso);
    handleChange('saas_migration_notice_message', noticeText);
    handleChange('saas_migration_notice_text', noticeText);
    handleChange('saas_migration_notice_target_method', targetMethodKey);
    handleChange('saas_migration_target_method', targetMethodKey);

    // Save directly to practice settings
    updatePracticeSettings({
      saas_migration_notice_enabled: true,
      saas_migration_notice_active: true,
      saas_migration_notice_message: noticeText,
      saas_migration_notice_text: noticeText,
      saas_migration_notice_target_method: targetMethodKey,
      saas_migration_target_method: targetMethodKey,
      saas_migration_affected_methods: affectedMethods,
      saas_migration_deadline: formData.saas_migration_deadline || '',
      saas_migration_last_sent_at: nowIso
    });

    // 2. Dispatch real notification to in-app bell for doctors
    triggerNotification({
      type: 'subscription',
      title: '📢 Actualización en Medio de Cobro SaaS',
      message: `${noticeText} (Método preferente: ${targetLabel})`,
      force: true
    });

    try {
      confetti({ particleCount: 50, spread: 60 });
    } catch {}

    setBroadcasting(false);
    setBroadcastSent(true);
    setTimeout(() => setBroadcastSent(false), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Intro Banner */}
      <div className="p-5 bg-gradient-to-r from-neutral-900 to-neutral-800 text-white rounded-3xl border border-neutral-700/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-neutral-950 font-bold text-[10px] tracking-wide uppercase flex items-center gap-1">
                <Sliders className="w-3 h-3" />
                Orquestador de Cobros
              </span>
              <span className="text-xs text-neutral-300 font-medium">
                Suscripciones de Médicos & Consultorios
              </span>
            </div>
            <h3 className="text-lg font-bold">
              Prioridad de Pasarelas y Métodos Activos
            </h3>
            <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
              Elige qué medios de pago habilitar a tus clientes, cuál es el método principal con acción directa ("Pagar Ahora") y el orden de visualización de los métodos alternativos.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-neutral-800/80 p-3 rounded-2xl border border-neutral-700 text-xs">
            <Layers className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="text-[11px] text-neutral-400 block">Método Principal Actual:</span>
              <span className="font-bold text-white uppercase text-xs">
                {ALL_METHODS.find(m => m.key === primaryMethod)?.label.split('(')[0] || primaryMethod}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. SELECCIÓN DE MÉTODOS HABILITADOS Y ORDEN DE PRIORIDAD */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
          <div>
            <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-neutral-700" />
              1. Orden de Prioridad y Métodos Habilitados
            </h4>
            <p className="text-xs text-neutral-500">
              Usa las flechas para ordenar las pasarelas. El primer método habilitado será la opción por defecto en el checkout.
            </p>
          </div>
          <span className="text-[11px] text-neutral-400 font-mono">
            {currentPriority.filter(k => isEnabled(k)).length} de {ALL_METHODS.length} activos
          </span>
        </div>

        <div className="space-y-2.5">
          {currentPriority.map((methodKey, index) => {
            const meta = ALL_METHODS.find(m => m.key === methodKey);
            if (!meta) return null;
            const enabled = isEnabled(methodKey);
            const isPrimary = primaryMethod === methodKey;
            const Icon = meta.icon;

            return (
              <div
                key={methodKey}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  !enabled
                    ? 'bg-neutral-50/70 border-neutral-200 opacity-60'
                    : isPrimary
                      ? 'bg-amber-50/40 border-amber-400 shadow-xs'
                      : 'bg-white border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-start md:items-center gap-3.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    isPrimary ? 'bg-amber-400 text-neutral-950' : 'bg-neutral-100 text-neutral-700'
                  }`}>
                    {index + 1}º
                  </div>

                  <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-700 shrink-0 border border-neutral-200">
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-neutral-900">
                        {meta.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.tagColor}`}>
                        {meta.tag}
                      </span>
                      {isPrimary && enabled && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-amber-700" />
                          Principal (1-Click)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 max-w-xl">
                      {meta.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                  {/* Primary Selector */}
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(methodKey)}
                    disabled={!enabled}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition cursor-pointer flex items-center gap-1 ${
                      isPrimary
                        ? 'bg-amber-400 text-neutral-950 border-amber-400 font-bold'
                        : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                    }`}
                    title="Definir como método predeterminado en el botón Pagar Ahora"
                  >
                    {isPrimary ? 'Es Principal' : 'Hacer Principal'}
                  </button>

                  {/* Move Up/Down priority */}
                  <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => movePriority(index, 'up')}
                      className="p-1.5 hover:bg-neutral-200 text-neutral-600 disabled:opacity-30 cursor-pointer"
                      title="Subir prioridad"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-[1px] h-4 bg-neutral-200" />
                    <button
                      type="button"
                      disabled={index === currentPriority.length - 1}
                      onClick={() => movePriority(index, 'down')}
                      className="p-1.5 hover:bg-neutral-200 text-neutral-600 disabled:opacity-30 cursor-pointer"
                      title="Bajar prioridad"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Toggle On/Off */}
                  <button
                    type="button"
                    onClick={() => toggleMethodEnabled(methodKey)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                      enabled
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
                    <span>{enabled ? 'Habilitado' : 'Deshabilitado'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. MÓDULO DE AVISOS DE MIGRACIÓN DE SUSCRIPCIÓN */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-neutral-900">
                  2. Gestor de Avisos para Migración de Suscripciones
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  Sin Cancelar Clientes Activos
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Avisa a los clientes que usan una pasarela antigua para que migren al nuevo método sin cortar su servicio.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isMigrationActive}
              onChange={e => handleToggleMigrationActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {/* Informative Context Card */}
        <div className="p-4 bg-sky-50/80 border border-sky-200 rounded-2xl text-xs space-y-1.5 text-sky-950">
          <div className="flex items-center gap-2 font-bold text-sky-900">
            <Info className="w-4 h-4 text-sky-700 shrink-0" />
            <span>¿Cómo funciona la continuidad de pagos recurrentes?</span>
          </div>
          <p className="text-[11px] leading-relaxed text-sky-800">
            Si un cliente ya está suscripto con débito automático en <strong>Mercado Pago</strong> o <strong>Lemon Squeezy</strong>, su suscripción <strong>no se cancela</strong>. Seguirá cobrándose automáticamente hasta que el usuario decida cambiarla o cancelarla. Al activar este aviso, los usuarios que paguen con el método afectado verán un banner explicativo en su sección de suscripción recomendando pasar al método oficial de tu preferencia.
          </p>
        </div>

        {/* Configuration details when switch is ON */}
        {isMigrationActive && (
          <div className="space-y-4 pt-2 border-t border-neutral-100 animate-fade-in text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1.5">
                  Método(s) que dejas de usar o deseas migrar:
                </label>
                <div className="space-y-2 p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                  {ALL_METHODS.map(m => {
                    const isChecked = affectedMethods.includes(m.key);
                    return (
                      <label key={m.key} className="flex items-center gap-2.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAffectedMethod(m.key)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                        />
                        <span className="font-medium text-neutral-800">{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1.5">
                    Método de destino recomendado (Nuevo medio oficial):
                  </label>
                  <select
                    value={formData.saas_migration_notice_target_method || formData.saas_migration_target_method || 'lemonsqueezy'}
                    onChange={e => {
                      handleChange('saas_migration_notice_target_method', e.target.value);
                      handleChange('saas_migration_target_method', e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 text-xs font-semibold"
                  >
                    <option value="lemonsqueezy">Lemon Squeezy (Suscripción Internacional/Local)</option>
                    <option value="transfer">Transferencia Bancaria Directa (CBU / Alias)</option>
                    <option value="mercadopago">Mercado Pago (Débito Automático)</option>
                    <option value="dlocal_go">DLocal Go (Checkout Pro)</option>
                  </select>

                  <p className="text-[11px] text-neutral-500 mt-1">
                    Los médicos verán un botón de acción directo para adherirse a este método con 1 clic.
                  </p>
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1.5">
                    Fecha límite sugerida (Opcional):
                  </label>
                  <input
                    type="text"
                    value={formData.saas_migration_deadline || ''}
                    onChange={e => handleChange('saas_migration_deadline', e.target.value)}
                    placeholder="Ej: 31 de Octubre o 'Antes de tu próximo ciclo de cobro'"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1.5">
                Mensaje institucional para los médicos (Texto del aviso):
              </label>
              <textarea
                rows={3}
                value={formData.saas_migration_notice_message || formData.saas_migration_notice_text || 'Estamos optimizando nuestra pasarela de pagos. Tu suscripción actual sigue activa sin interrupciones, pero te invitamos a adherirte al nuevo método preferente antes de tu próxima fecha de cobro.'}
                onChange={e => {
                  handleChange('saas_migration_notice_message', e.target.value);
                  handleChange('saas_migration_notice_text', e.target.value);
                }}
                placeholder="Escribe el aviso explicativo que verán los médicos..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 text-xs leading-relaxed"
              />
            </div>

            {/* Live Banner Preview */}
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider uppercase text-amber-800 block">
                  Vista previa del banner que verán los clientes afectados:
                </span>
                {formData.saas_migration_deadline && (
                  <span className="text-[10px] font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                    Plazo sugerido: {formData.saas_migration_deadline}
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-amber-200">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-neutral-800 leading-relaxed">
                    {formData.saas_migration_notice_message || formData.saas_migration_notice_text || 'Estamos optimizando nuestra pasarela de pagos. Tu suscripción actual sigue activa sin interrupciones, pero te invitamos a adherirte al nuevo método preferente.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-lg text-xs shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  Actualizar a {ALL_METHODS.find(m => m.key === (formData.saas_migration_notice_target_method || formData.saas_migration_target_method || 'lemonsqueezy'))?.label.split('(')[0]}
                </button>
              </div>
            </div>

            {/* ACTION: Broadcast / Enviar Aviso a los Médicos */}
            <div className="pt-3 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Send className="w-4 h-4 text-amber-700" />
                  <span className="font-bold text-xs text-neutral-900">
                    Función de Difusión: Avisar a los Médicos
                  </span>
                  {formData.saas_migration_last_sent_at && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Último aviso: {new Date(formData.saas_migration_last_sent_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-600">
                  Despacha una notificación oficial a la campana del sistema para todos los profesionales ({saasTenants.length || 1} cuentas registradas) y asegura el banner visible en su módulo de planes.
                </p>
                {broadcastSent && (
                  <p className="text-[11px] font-bold text-emerald-700 animate-in fade-in flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ¡Aviso emitido y guardado exitosamente con confirmación visual!
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleBroadcastMigrationNotice}
                disabled={broadcasting}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-neutral-950 font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
              >
                {broadcasting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-neutral-950" />
                ) : (
                  <Send className="w-4 h-4 text-neutral-950" />
                )}
                <span>{formData.saas_migration_last_sent_at ? 'Reenviar Aviso a Médicos' : 'Avisar a los Médicos Ahora'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
