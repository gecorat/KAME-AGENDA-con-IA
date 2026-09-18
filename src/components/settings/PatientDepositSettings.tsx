import React, { useState } from 'react';
import {
  CreditCard,
  Building2,
  Landmark,
  Copy,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Info,
  DollarSign,
  Key,
  Eye,
  EyeOff,
  HelpCircle,
  Check,
  AlertCircle,
  RefreshCw,
  Zap,
  ArrowRight,
  Smartphone,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PracticeSettings } from '../../types';

interface PatientDepositSettingsProps {
  formData: PracticeSettings;
  onChange: (field: keyof PracticeSettings, value: any) => void;
}

export const PatientDepositSettings: React.FC<PatientDepositSettingsProps> = ({
  formData,
  onChange
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const [tokenInput, setTokenInput] = useState(formData.patient_deposit_mp_token || '');
  const [showTokenChars, setShowTokenChars] = useState(false);
  const [showStepGuide, setShowStepGuide] = useState(false);
  const [testingCheckout, setTestingCheckout] = useState(false);
  const [testCheckoutUrl, setTestCheckoutUrl] = useState<string | null>(null);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const depositEnabled = formData.patient_deposit_enabled ?? true;
  const depositType = formData.patient_deposit_type || 'percent';
  const depositPercent = formData.patient_deposit_percent ?? 30;
  const depositFixedAmount = formData.patient_deposit_fixed_amount ?? 15000;
  const depositMethod = formData.patient_deposit_method || 'alias_cbu';

  const isBasicPlan = formData.subscription_plan === 'basic' && !formData.is_permanent;
  const isMpConnected = Boolean(formData.patient_deposit_mp_token || formData.patient_deposit_mp_connected);

  // Quick preset buttons for fixed amounts
  const fixedPresets = [5000, 10000, 15000, 20000, 30000, 50000];
  // Quick preset buttons for percentages
  const percentPresets = [15, 20, 30, 50, 100];

  const handleVerifyAndSaveToken = async (overrideToken?: string) => {
    const rawToken = (overrideToken ?? tokenInput).trim();
    if (!rawToken) {
      setVerificationResult({
        success: false,
        message: 'Por favor pega tu Access Token de Mercado Pago (empieza con APP_USR-).'
      });
      return;
    }

    setVerifyingToken(true);
    setVerificationResult(null);

    try {
      const res = await fetch('/api/mercadopago/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: rawToken })
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        onChange('patient_deposit_mp_token', rawToken);
        onChange('patient_deposit_mp_connected', true);
        onChange('patient_deposit_mp_email', data.email || '');
        onChange('patient_deposit_mp_user_id', String(data.userId || ''));
        onChange('patient_deposit_mp_collector_id', String(data.collectorId || ''));
        onChange('patient_deposit_mp_live_mode', Boolean(data.liveMode));
        onChange('patient_deposit_method', 'mercadopago_connect');

        // Also sync to server cache
        try {
          await fetch('/api/mercadopago/save-credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: rawToken,
              email: data.email,
              userId: data.userId
            })
          });
        } catch {
          // ignore background cache sync error
        }

        setVerificationResult({
          success: true,
          message: `¡Cuenta verificada con éxito! Acreditación a nombre de: ${data.name || data.email || 'Titular de Mercado Pago'}.`,
          details: data
        });
      } else {
        setVerificationResult({
          success: false,
          message: data.error || 'No se pudo verificar el Access Token. Revisa que pertenezca a tu cuenta de Mercado Pago.'
        });
      }
    } catch (err: any) {
      setVerificationResult({
        success: false,
        message: `Error de conexión al verificar: ${err.message}`
      });
    } finally {
      setVerifyingToken(false);
    }
  };

  const handleTestCheckout = async () => {
    setTestingCheckout(true);
    try {
      const res = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Prueba de Seña - Consultorio',
          amount: 100,
          price: 100,
          patientName: 'Paciente de Prueba',
          patientEmail: formData.patient_deposit_mp_email || formData.email || 'paciente.prueba@gmail.com',
          accessToken: tokenInput || formData.patient_deposit_mp_token
        })
      });

      const data = await res.json();
      if (res.ok && (data.init_point || data.sandbox_init_point)) {
        const link = data.init_point || data.sandbox_init_point;
        setTestCheckoutUrl(link);
        window.open(link, '_blank');
      } else {
        alert(data.error || 'Error al generar la preferencia de prueba');
      }
    } catch (e: any) {
      alert(`Error al generar cobro de prueba: ${e.message}`);
    } finally {
      setTestingCheckout(false);
    }
  };

  const handleDisconnectMp = () => {
    if (confirm('¿Deseas desvincular tu cuenta de Mercado Pago? Volverás al modo de Transferencia por Alias/CBU.')) {
      onChange('patient_deposit_mp_token', '');
      onChange('patient_deposit_mp_connected', false);
      onChange('patient_deposit_mp_email', '');
      onChange('patient_deposit_method', 'alias_cbu');
      setTokenInput('');
      setVerificationResult(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="p-5 bg-white rounded-2xl border border-neutral-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-neutral-900 font-display">
                  Datos de Cobro & Señas de Pacientes
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    depositEnabled
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {depositEnabled ? '✓ Señas Activadas' : 'Desactivado'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                Define tus datos de cobro (Alias, CBU o Mercado Pago) para recibir las señas directo en tu cuenta y asegurar la asistencia a tus turnos.
              </p>
            </div>
          </div>

          {/* Master Toggle Switch */}
          <div className="flex items-center gap-3 bg-neutral-50 p-2 rounded-xl border border-neutral-200 shrink-0 self-start sm:self-auto">
            <span className="text-xs font-semibold text-neutral-800">
              {depositEnabled ? 'Cobrar seña' : 'Sin seña'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={depositEnabled}
                onChange={e => onChange('patient_deposit_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        {/* Informative state bar when disabled */}
        {!depositEnabled && (
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-600 flex items-center gap-2">
            <Info className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>
              Actualmente los pacientes pueden reservar turnos sin abonar seña anticipada. Activa la opción arriba si deseas que transfieran o abonen con Mercado Pago para confirmar.
            </span>
          </div>
        )}
      </div>

      {depositEnabled && (
        <div className="space-y-6">
          {/* PASO 1: ¿Cuánto vas a cobrar de seña? */}
          <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center">
                1
              </div>
              <h4 className="text-sm font-bold text-neutral-900">
                ¿Qué valor de seña solicitarás al paciente?
              </h4>
            </div>

            {/* Type selector tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onChange('patient_deposit_type', 'fixed')}
                className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  depositType === 'fixed'
                    ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-400'
                    : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100/70'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  depositType === 'fixed' ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-700'
                }`}>
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-neutral-900 block">
                    Monto Fijo en Pesos ($ ARS)
                  </span>
                  <span className="text-[11px] text-neutral-500 block mt-0.5">
                    Mismo valor para cualquier servicio (ej: $15.000)
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onChange('patient_deposit_type', 'percent')}
                className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  depositType === 'percent'
                    ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-400'
                    : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100/70'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  depositType === 'percent' ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-700'
                }`}>
                  <span className="text-xs font-black">%</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-neutral-900 block">
                    Porcentaje del Servicio (%)
                  </span>
                  <span className="text-[11px] text-neutral-500 block mt-0.5">
                    Se calcula según el arancel de la consulta seleccionada
                  </span>
                </div>
              </button>
            </div>

            {/* Input & Presets */}
            {depositType === 'fixed' ? (
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-neutral-700">
                  Monto Fijo de la Seña:
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-500">
                      $
                    </span>
                    <input
                      type="number"
                      min="500"
                      step="500"
                      value={depositFixedAmount}
                      onChange={e => onChange('patient_deposit_fixed_amount', Math.max(0, Number(e.target.value)))}
                      className="w-full pl-8 pr-16 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-mono font-bold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="15000"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                      ARS
                    </span>
                  </div>

                  {/* Fast presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {fixedPresets.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => onChange('patient_deposit_fixed_amount', preset)}
                        className={`px-2.5 py-2 text-xs font-mono font-semibold rounded-lg border transition cursor-pointer ${
                          depositFixedAmount === preset
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        ${preset.toLocaleString('es-AR')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-neutral-700">
                    Porcentaje de Seña a Solicitar:
                  </label>
                  <span className="font-mono font-bold text-sm text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                    {depositPercent}%
                  </span>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={depositPercent}
                  onChange={e => onChange('patient_deposit_percent', Number(e.target.value))}
                  className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />

                {/* Fast percent chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  {percentPresets.map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => onChange('patient_deposit_percent', pct)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                        depositPercent === pct
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      {pct}% {pct === 30 ? '★ Recomendado' : pct === 100 ? '(Pago Total)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PASO 2: ¿Dónde quieres recibir el dinero? (Métodos de cobro) */}
          <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center">
                  2
                </div>
                <h4 className="text-sm font-bold text-neutral-900">
                  ¿Cómo quieres que te paguen? (Medio de Cobro)
                </h4>
              </div>
              <span className="text-[11px] text-neutral-500">
                Selecciona una opción
              </span>
            </div>

            {/* Big 2-Card Option Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Transferencia Bancaria (Alias / CBU) */}
              <div
                onClick={() => onChange('patient_deposit_method', 'alias_cbu')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  depositMethod === 'alias_cbu'
                    ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                    : 'border-neutral-200 bg-neutral-50/50 hover:bg-neutral-100/70'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                      0% Comisiones
                    </span>
                  </div>

                  <div>
                    <h5 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                      <span>Transferencia Bancaria Directa</span>
                      {depositMethod === 'alias_cbu' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </h5>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                      Tus pacientes te transfieren desde su banco o billetera digital (Mercado Pago, Cuenta DNI, Santander, etc.) usando tu <strong>Alias</strong> o <strong>CBU</strong>.
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-neutral-200/70 flex items-center justify-between text-[11px] text-neutral-600">
                  <span>✓ 100% de la seña para ti</span>
                  <span className="font-semibold text-emerald-700">Fácil y sin trámites</span>
                </div>
              </div>

              {/* Option 2: Mercado Pago Online */}
              <div
                onClick={() => onChange('patient_deposit_method', 'mercadopago_connect')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  depositMethod === 'mercadopago_connect' || depositMethod === 'mercadopago_link'
                    ? 'border-[#009ee3] bg-sky-50/40 shadow-xs'
                    : 'border-neutral-200 bg-neutral-50/50 hover:bg-neutral-100/70'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#009ee3]/10 text-[#009ee3] flex items-center justify-center font-bold">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-200">
                      Cobro Online Inmediato
                    </span>
                  </div>

                  <div>
                    <h5 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                      <span>Mercado Pago (Online)</span>
                      {(depositMethod === 'mercadopago_connect' || depositMethod === 'mercadopago_link') && (
                        <CheckCircle2 className="w-4 h-4 text-[#009ee3]" />
                      )}
                    </h5>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                      El paciente paga con <strong>tarjeta de débito, crédito o dinero en cuenta</strong> al momento de reservar y el turno se valida solo.
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-neutral-200/70 flex items-center justify-between text-[11px] text-neutral-600">
                  <span>✓ Acreditación inmediata</span>
                  <span className="font-semibold text-[#009ee3]">Tarjetas y Saldo MP</span>
                </div>
              </div>
            </div>

            {/* FORMULARIO: OPCIÓN 1 - TRANSFERENCIA BANCARIA (ALIAS / CBU) */}
            {depositMethod === 'alias_cbu' && (
              <div className="p-4 sm:p-5 bg-neutral-50 rounded-2xl border border-neutral-200/90 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                  <h5 className="text-xs font-bold text-neutral-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <span>Datos de tu Cuenta Bancaria o Billetera</span>
                  </h5>
                  <span className="text-[11px] text-neutral-500">
                    Se mostrarán en la pantalla del paciente
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Alias (Destacado) */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-bold text-neutral-800">
                      Alias de tu Cuenta (Recomendado):
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.patient_deposit_alias || ''}
                        onChange={e => onChange('patient_deposit_alias', e.target.value.trim().toLowerCase())}
                        placeholder="consultorio.turnos.mp o dr.gonzalo.mp"
                        className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-sm font-mono font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      {formData.patient_deposit_alias && (
                        <button
                          type="button"
                          onClick={() => copyText(formData.patient_deposit_alias || '', 'alias')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                        >
                          {copiedField === 'alias' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedField === 'alias' ? 'Copiado' : 'Probar'}</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Puede ser tu Alias de Mercado Pago (ej: <em>juan.perez.mp</em>), Cuenta DNI o cualquier banco.
                    </p>
                  </div>

                  {/* CBU / CVU */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-700">
                      CBU o CVU (22 dígitos):
                    </label>
                    <input
                      type="text"
                      maxLength={22}
                      value={formData.patient_deposit_cbu || ''}
                      onChange={e => onChange('patient_deposit_cbu', e.target.value.replace(/\D/g, ''))}
                      placeholder="0000003100010000000000"
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    />
                  </div>

                  {/* Titular de la Cuenta */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-700">
                      Nombre del Titular de la Cuenta:
                    </label>
                    <input
                      type="text"
                      value={formData.patient_deposit_account_holder || ''}
                      onChange={e => onChange('patient_deposit_account_holder', e.target.value)}
                      placeholder={formData.professional_name || formData.practice_name || 'Dr. Gonzalo Corat'}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    />
                  </div>

                  {/* Banco o Billetera */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-700">
                      Banco o Billetera Digital:
                    </label>
                    <input
                      type="text"
                      value={formData.patient_deposit_bank_name || ''}
                      onChange={e => onChange('patient_deposit_bank_name', e.target.value)}
                      placeholder="Mercado Pago / Banco Galicia / Santander"
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    />
                  </div>

                  {/* CUIT / CUIL (Opcional) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-700">
                      CUIT / CUIL (Opcional):
                    </label>
                    <input
                      type="text"
                      value={formData.patient_deposit_cuit || ''}
                      onChange={e => onChange('patient_deposit_cuit', e.target.value)}
                      placeholder="20-12345678-9"
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-xs text-emerald-950 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[11px]">
                    Al agendar desde tu página web o por WhatsApp, el paciente verá estos datos, podrá copiar tu Alias con 1 toque y subir su comprobante de transferencia para que lo valides en tu bandeja de cobros.
                  </p>
                </div>
              </div>
            )}

            {/* FORMULARIO: OPCIÓN 2 - MERCADO PAGO ONLINE */}
            {(depositMethod === 'mercadopago_connect' || depositMethod === 'mercadopago_link') && (
              <div className="space-y-4">
                {/* Plan warning for Basic Plan */}
                {isBasicPlan ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      <Zap className="w-4 h-4 text-amber-600" />
                      <span>La pasarela de pago online desatendida está incluida en el Plan Pro AI</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-800">
                      En el Plan Esencial puedes cobrar señas sin costo adicional mediante <strong>Transferencia Bancaria (Alias / CBU)</strong> o usando tu <strong>Link de Pago de Mercado Pago</strong>.
                    </p>
                  </div>
                ) : null}

                {/* Si ya está vinculado con Access Token */}
                {isMpConnected && formData.patient_deposit_mp_token ? (
                  <div className="p-5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-emerald-950 block">
                            Tu cuenta de Mercado Pago está vinculada y activa
                          </span>
                          <span className="text-xs font-mono text-emerald-800 block">
                            {formData.patient_deposit_mp_email || 'Acreditación directa en tu cuenta'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          disabled={testingCheckout}
                          onClick={handleTestCheckout}
                          className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Genera un enlace de cobro real de $100 ARS para probar que Mercado Pago responde"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-[#009ee3]" />
                          <span>{testingCheckout ? 'Generando...' : 'Probar Cobro ($100)'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDisconnectMp}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Cambiar Cuenta
                        </button>
                      </div>
                    </div>

                    {testCheckoutUrl && (
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
                        <span className="text-emerald-800 font-medium truncate mr-2">
                          Checkout de prueba generado con éxito
                        </span>
                        <a
                          href={testCheckoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#009ee3] hover:underline font-bold flex items-center gap-1 shrink-0"
                        >
                          <span>Abrir enlace</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Formulario Simplificado para conectar Mercado Pago */}
                <div className="p-4 sm:p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-neutral-900 uppercase tracking-wide flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-[#009ee3]" />
                        <span>Conexión de tu Mercado Pago</span>
                      </h5>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        El dinero de las señas entra directamente a tu cuenta de Mercado Pago personal o de consultorio.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowStepGuide(!showStepGuide)}
                      className="text-xs font-semibold text-[#009ee3] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{showStepGuide ? 'Ocultar guía' : '¿Cómo lo obtengo? (2 min)'}</span>
                      {showStepGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Guía paso a paso interactiva y muy amigable */}
                  {showStepGuide && (
                    <div className="p-4 bg-sky-50/90 rounded-xl border border-sky-200 text-xs text-sky-950 space-y-3">
                      <div className="font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[#009ee3]" />
                          Solo 3 pasos para cobrar con Mercado Pago en tu web:
                        </span>
                        <a
                          href="https://www.mercadopago.com.ar/developers/panel/app"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#009ee3] hover:underline font-bold flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-sky-300 shadow-2xs"
                        >
                          <span>Abrir Mercado Pago Developers</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <div className="p-2.5 bg-white/90 rounded-lg border border-sky-200/80 space-y-1">
                          <span className="w-5 h-5 rounded-full bg-[#009ee3] text-white text-[10px] font-bold flex items-center justify-center">1</span>
                          <p className="font-semibold text-neutral-900 text-[11px]">Inicia sesión</p>
                          <p className="text-[10px] text-neutral-600 leading-tight">
                            Entra a <strong className="underline">mercadopago.com.ar/developers</strong> con tu cuenta donde quieres cobrar.
                          </p>
                        </div>

                        <div className="p-2.5 bg-white/90 rounded-lg border border-sky-200/80 space-y-1">
                          <span className="w-5 h-5 rounded-full bg-[#009ee3] text-white text-[10px] font-bold flex items-center justify-center">2</span>
                          <p className="font-semibold text-neutral-900 text-[11px]">Copia el Access Token</p>
                          <p className="text-[10px] text-neutral-600 leading-tight">
                            Ve a <em>"Tus integraciones"</em> o <em>"Crear aplicación"</em> y en <em>"Credenciales de producción"</em> copia el <strong>Access Token</strong> (comienza con <code className="bg-neutral-100 px-1 rounded">APP_USR-</code>).
                          </p>
                        </div>

                        <div className="p-2.5 bg-white/90 rounded-lg border border-sky-200/80 space-y-1">
                          <span className="w-5 h-5 rounded-full bg-[#009ee3] text-white text-[10px] font-bold flex items-center justify-center">3</span>
                          <p className="font-semibold text-neutral-900 text-[11px]">Pégalo y valida</p>
                          <p className="text-[10px] text-neutral-600 leading-tight">
                            Pégalo en la casilla de abajo y toca <strong>"Verificar y Vincular"</strong>. ¡Queda listo al instante!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Input de Access Token */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-neutral-800">
                      Access Token de Mercado Pago:
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showTokenChars ? 'text' : 'password'}
                          placeholder="APP_USR-0000000000000000-000000-00000000000000000000000000000000-000000000"
                          value={tokenInput}
                          onChange={e => setTokenInput(e.target.value)}
                          className="w-full pl-3 pr-10 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#009ee3]/20 focus:border-[#009ee3]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTokenChars(!showTokenChars)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5"
                          title={showTokenChars ? 'Ocultar' : 'Mostrar'}
                        >
                          {showTokenChars ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={verifyingToken || !tokenInput.trim()}
                        onClick={() => handleVerifyAndSaveToken()}
                        className="px-4 py-2.5 bg-[#009ee3] hover:bg-[#0081b8] disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-xs font-bold rounded-xl transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {verifyingToken ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Validando...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Verificar y Vincular</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Feedback de Verificación */}
                  {verificationResult && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                        verificationResult.success
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      {verificationResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <p className="font-semibold">{verificationResult.message}</p>
                        {verificationResult.details?.email && (
                          <p className="text-[11px] opacity-90 font-mono">
                            Cuenta: {verificationResult.details.email} | País: {verificationResult.details.countryId || 'AR'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Alternativa Súper Fácil: Link de Pago o Alias de Mercado Pago */}
                  <div className="pt-4 border-t border-neutral-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-neutral-800">
                        Opción Alternativa: Link de Cobro o Alias de Mercado Pago
                      </label>
                      <span className="text-[10px] text-neutral-400">Opcional</span>
                    </div>
                    <input
                      type="text"
                      placeholder="https://mpago.la/... o https://link.mercadopago.com.ar/tu-nombre o tu.alias.mp"
                      value={formData.patient_deposit_mp_link || ''}
                      onChange={e => onChange('patient_deposit_mp_link', e.target.value.trim())}
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl font-mono text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    />
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      Si creaste un link de pago directo en tu app de Mercado Pago, puedes pegarlo aquí. El paciente podrá hacer clic para abonar la seña.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PASO 3: Vista Previa Real (Lo que verá tu paciente al reservar) */}
          <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-neutral-600" />
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                  Vista previa: así verá el paciente la seña al reservar
                </h4>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> En tiempo real
              </span>
            </div>

            {/* Simulated Patient Screen */}
            <div className="p-4 bg-neutral-900 text-white rounded-2xl space-y-3 max-w-lg mx-auto shadow-sm">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-800 text-xs">
                <span className="text-neutral-400">Seña Requerida:</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  {depositType === 'fixed'
                    ? `$${depositFixedAmount.toLocaleString('es-AR')} ARS`
                    : `${depositPercent}% del arancel`}
                </span>
              </div>

              {depositMethod === 'alias_cbu' ? (
                <div className="p-3 bg-neutral-800/90 rounded-xl border border-neutral-700 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 text-[11px]">Transferir a Alias:</span>
                    <span className="font-mono font-bold text-emerald-300">
                      {formData.patient_deposit_alias || 'consultorio.turnos.mp'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span>Titular:</span>
                    <span className="text-white font-medium">
                      {formData.patient_deposit_account_holder || formData.professional_name || 'Titular de la cuenta'}
                    </span>
                  </div>
                  <div className="w-full py-2 bg-neutral-700 text-neutral-200 rounded-lg text-center font-semibold text-xs mt-1">
                    Copiar datos y transferir
                  </div>
                </div>
              ) : (
                <div className="w-full py-2.5 px-4 bg-[#009ee3] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-default">
                  <CreditCard className="w-4 h-4" />
                  <span>
                    Pagar Seña con Mercado Pago (
                    {depositType === 'fixed'
                      ? `$${depositFixedAmount.toLocaleString('es-AR')}`
                      : `${depositPercent}%`}
                    )
                  </span>
                </div>
              )}

              <p className="text-[10px] text-neutral-400 text-center">
                {depositMethod === 'alias_cbu'
                  ? 'El paciente transfiere desde su banco y adjunta el comprobante.'
                  : 'Acreditación instantánea con tarjeta de débito, crédito o dinero en cuenta.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
