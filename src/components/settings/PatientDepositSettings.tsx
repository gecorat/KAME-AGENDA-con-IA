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
  DollarSign
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
  const [connectingMp, setConnectingMp] = useState(false);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const depositEnabled = formData.patient_deposit_enabled ?? formData.mercadopago_deposit_enabled ?? true;
  const depositType = formData.patient_deposit_type || 'percent';
  const depositPercent = formData.patient_deposit_percent ?? formData.mercadopago_deposit_percent ?? 30;
  const depositFixedAmount = formData.patient_deposit_fixed_amount ?? 85000;
  const depositMethod = formData.patient_deposit_method || 'alias_cbu';

  const handleToggleDeposit = (enabled: boolean) => {
    onChange('patient_deposit_enabled', enabled);
    onChange('mercadopago_deposit_enabled', enabled);
  };

  const handleDepositTypeChange = (type: 'percent' | 'fixed') => {
    onChange('patient_deposit_type', type);
  };

  const handlePercentChange = (val: number) => {
    if (val > 100) {
      // If user inputs a value > 100 (e.g. 85000), automatically switch to fixed amount ($ ARS) mode
      onChange('patient_deposit_type', 'fixed');
      onChange('patient_deposit_fixed_amount', val);
      return;
    }
    const cleanVal = Math.min(100, Math.max(1, isNaN(val) ? 30 : val));
    onChange('patient_deposit_percent', cleanVal);
    onChange('mercadopago_deposit_percent', cleanVal);
  };

  const handleFixedAmountChange = (val: number) => {
    const cleanVal = Math.max(0, isNaN(val) ? 0 : val);
    onChange('patient_deposit_fixed_amount', cleanVal);
  };

  const handleSimulateMpConnect = () => {
    setConnectingMp(true);
    setTimeout(() => {
      onChange('patient_deposit_mp_connected', true);
      onChange('patient_deposit_mp_email', formData.email || 'consultorio@mercadopago.com');
      setConnectingMp(false);
    }, 1000);
  };

  const handleDisconnectMp = () => {
    onChange('patient_deposit_mp_connected', false);
    onChange('patient_deposit_mp_email', '');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Intro Explanation Card */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
                Cobro de Señas & Adelantos a Pacientes
              </h3>
              <p className="text-xs text-neutral-500">
                Define cómo tus pacientes abonan la seña para asegurar su turno. El dinero se acredita directamente en tu cuenta.
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
            Tu Consultorio
          </span>
        </div>

        <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>100% para tu cuenta:</strong> A diferencia de las suscripciones de la plataforma, las señas de tus pacientes son cobros propios de tu práctica profesional. No necesitas conocimientos de programación ni gestionar servidores para cobrar.
          </p>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-200/90">
          <div>
            <p className="text-xs font-bold text-neutral-900">Exigir seña para confirmar turnos de pacientes</p>
            <p className="text-[11px] text-neutral-500">
              Reduce el ausentismo solicitando un anticipo en el portal web y en las reservas por WhatsApp.
            </p>
          </div>
          <input
            type="checkbox"
            checked={depositEnabled}
            onChange={e => handleToggleDeposit(e.target.checked)}
            className="w-4 h-4 text-neutral-900 rounded focus:ring-neutral-900"
          />
        </div>

        {/* Deposit Calculation Mode & Amount */}
        {depositEnabled && (
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/90 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-800">
                Modalidad del Importe de Seña:
              </label>
              <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => handleDepositTypeChange('fixed')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    depositType === 'fixed'
                      ? 'bg-neutral-900 text-white shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  💵 Monto Fijo ($ ARS)
                </button>
                <button
                  type="button"
                  onClick={() => handleDepositTypeChange('percent')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    depositType === 'percent'
                      ? 'bg-neutral-900 text-white shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  📊 Porcentaje (%)
                </button>
              </div>
            </div>

            {/* Mode 1: Monto Fijo ($ ARS) - Allows 85000 or any custom amount */}
            {depositType === 'fixed' ? (
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-neutral-700">
                      Monto de Seña Fijo por Turno ($):
                    </span>
                    <span className="text-sm font-bold font-mono text-emerald-700 bg-white px-3 py-0.5 rounded-lg border border-neutral-200 shadow-2xs">
                      ${depositFixedAmount.toLocaleString('es-AR')} ARS
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400 font-mono">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={depositFixedAmount || ''}
                      onChange={e => handleFixedAmountChange(Number(e.target.value))}
                      placeholder="85000"
                      className="w-full pl-8 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono text-base font-bold text-neutral-900"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1.5">
                    Se solicitará exactamente este importe ($) para asegurar cualquier turno, sin importar el arancel del servicio.
                  </p>
                </div>

                {/* Quick amount presets */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">Montos rápidos:</span>
                  {[20000, 35000, 50000, 85000, 100000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleFixedAmountChange(preset)}
                      className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-lg border transition cursor-pointer ${
                        depositFixedAmount === preset
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                          : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                      }`}
                    >
                      ${preset.toLocaleString('es-AR')}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Mode 2: Porcentaje (%) */
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-700">
                    Porcentaje de Seña Requerido:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={depositPercent}
                      onChange={e => handlePercentChange(Number(e.target.value))}
                      className="w-16 px-2 py-1 text-xs font-bold text-center bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900 font-mono"
                    />
                    <span className="text-xs font-bold text-neutral-600">%</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={depositPercent}
                    onChange={e => handlePercentChange(parseInt(e.target.value) || 30)}
                    className="w-full accent-neutral-900 cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                  <span>10% (Simbólica)</span>
                  <span>30% (Recomendado)</span>
                  <span>50% (Procedimientos)</span>
                  <span>100% (Total)</span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Se calculará automáticamente el porcentaje seleccionado sobre el precio de cada servicio o consulta.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {depositEnabled && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
          <div>
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-1">
              Método de Cobro para tus Pacientes
            </h4>
            <p className="text-xs text-neutral-500">
              Selecciona cómo prefieres que tus pacientes te paguen la seña:
            </p>
          </div>

          {/* Method Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option 1: Alias / CBU */}
            <div
              onClick={() => onChange('patient_deposit_method', 'alias_cbu')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                depositMethod === 'alias_cbu'
                  ? 'border-neutral-900 bg-neutral-50/80 shadow-xs'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  0% Comisiones
                </span>
              </div>
              <h5 className="text-xs font-bold text-neutral-900">Transferencia Bancaria / Alias</h5>
              <p className="text-[11px] text-neutral-500 mt-1 leading-normal">
                El paciente transfiere a tu Alias/CBU de cualquier banco o billetera (Mercado Pago, Galicia, etc.) y envía el comprobante.
              </p>
            </div>

            {/* Option 2: Mercado Pago Connect / Link */}
            <div
              onClick={() => onChange('patient_deposit_method', 'mercadopago_connect')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                depositMethod === 'mercadopago_connect' || depositMethod === 'mercadopago_link'
                  ? 'border-neutral-900 bg-neutral-50/80 shadow-xs'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#009ee3] text-white flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                  Automático
                </span>
              </div>
              <h5 className="text-xs font-bold text-neutral-900">Mercado Pago (Tarjeta & Débito)</h5>
              <p className="text-[11px] text-neutral-500 mt-1 leading-normal">
                Cobro inmediato con tarjeta o dinero en cuenta en tu propia cuenta de Mercado Pago personal o del consultorio.
              </p>
            </div>
          </div>

          {/* METHOD 1 FORM: ALIAS & CBU */}
          {depositMethod === 'alias_cbu' && (
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/90 space-y-4">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-neutral-700" />
                <h5 className="text-xs font-bold text-neutral-900">
                  Datos de tu Cuenta para Transferencias
                </h5>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Alias de la Cuenta (Recomendado):
                  </label>
                  <input
                    type="text"
                    placeholder="consultorio.turnos.mp"
                    value={formData.patient_deposit_alias || ''}
                    onChange={e => onChange('patient_deposit_alias', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg font-mono font-bold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                  <p className="text-[10px] text-neutral-400 mt-0.5">Fácil de recordar y escribir por el paciente.</p>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    CBU / CVU (22 dígitos):
                  </label>
                  <input
                    type="text"
                    maxLength={22}
                    placeholder="0000003100092837461524"
                    value={formData.patient_deposit_cbu || ''}
                    onChange={e => onChange('patient_deposit_cbu', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg font-mono text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Titular de la Cuenta:
                  </label>
                  <input
                    type="text"
                    placeholder="Dr/a. Especialista o Consultorio S.R.L."
                    value={formData.patient_deposit_account_holder || ''}
                    onChange={e => onChange('patient_deposit_account_holder', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Banco o Billetera Virtual:
                  </label>
                  <input
                    type="text"
                    placeholder="Mercado Pago / Banco Santander / Galicia"
                    value={formData.patient_deposit_bank_name || ''}
                    onChange={e => onChange('patient_deposit_bank_name', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-700 mb-1">
                    CUIT / CUIL (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="30-71829384-9"
                    value={formData.patient_deposit_cuit || ''}
                    onChange={e => onChange('patient_deposit_cuit', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg font-mono text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>
              </div>

              {/* Patient View Preview */}
              <div className="p-3.5 bg-white rounded-xl border border-neutral-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-700">
                    Vista previa de lo que verá el paciente al reservar:
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Listo para usar
                  </span>
                </div>
                <div className="p-3 bg-neutral-900 text-white rounded-lg text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Seña ({depositPercent}%):</span>
                    <span className="font-bold text-emerald-400">$5.400 ARS (ejemplo)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Alias:</span>
                    <span className="font-bold text-white bg-neutral-800 px-2 py-0.5 rounded">
                      {formData.patient_deposit_alias || 'consultorio.turnos.mp'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-400">Titular:</span>
                    <span>{formData.patient_deposit_account_holder || 'Consultorio Médico'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-400">Banco:</span>
                    <span>{formData.patient_deposit_bank_name || 'Mercado Pago'}</span>
                  </div>
                </div>
                <p className="text-[10px] text-neutral-500">
                  El paciente tendrá un botón directo para copiar el Alias y un enlace para enviar el comprobante de pago por WhatsApp al instante.
                </p>
              </div>
            </div>
          )}

          {/* METHOD 2 FORM: MERCADO PAGO CONNECT / LINK */}
          {(depositMethod === 'mercadopago_connect' || depositMethod === 'mercadopago_link') && (
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/90 space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#009ee3]" />
                <h5 className="text-xs font-bold text-neutral-900">
                  Vincular tu Cuenta de Mercado Pago
                </h5>
              </div>

              <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">
                      Estado de Conexión:
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {formData.patient_deposit_mp_connected
                        ? `Conectado a ${formData.patient_deposit_mp_email || formData.email}`
                        : 'Tu cuenta de Mercado Pago no está vinculada aún.'}
                    </span>
                  </div>

                  {formData.patient_deposit_mp_connected ? (
                    <button
                      type="button"
                      onClick={handleDisconnectMp}
                      className="px-3 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition"
                    >
                      Desconectar
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={connectingMp}
                      onClick={handleSimulateMpConnect}
                      className="px-4 py-2 bg-[#009ee3] hover:bg-[#0087c2] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{connectingMp ? 'Conectando...' : 'Conectar mi Mercado Pago'}</span>
                    </button>
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-100">
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    O pega tu Link de Cobro / Alias de Mercado Pago:
                  </label>
                  <input
                    type="url"
                    placeholder="https://mpago.la/2xYz..."
                    value={formData.patient_deposit_mp_link || ''}
                    onChange={e => onChange('patient_deposit_mp_link', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg font-mono text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Puedes generar un link de cobro desde tu app de Mercado Pago &gt; Cobrar &gt; Crear link.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic QR and Checkout link callout */}
          <div className="p-4 bg-gradient-to-r from-indigo-50/80 to-sky-50/80 border border-indigo-200/90 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-indigo-950">
                Generación Dinámica de Códigos QR & Links con Monto Precargado
              </h5>
              <p className="text-[11px] text-indigo-900 leading-relaxed">
                Al hacer clic en <strong>"Solicitar Pago"</strong> desde la lista o ficha de cualquier paciente, el sistema generará automáticamente un Código QR dinámico y un Link de Checkout de Mercado Pago con el importe exacto del turno y retorno directo para registrar el cobro al instante.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
