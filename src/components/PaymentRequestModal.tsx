import React, { useState, useEffect } from 'react';
import {
  X,
  Landmark,
  CreditCard,
  Send,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';

interface PaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientPhone?: string;
  concept: string;
  amount: number;
  appointmentId?: string;
}

export const PaymentRequestModal: React.FC<PaymentRequestModalProps> = ({
  isOpen,
  onClose,
  patientName,
  patientPhone,
  concept,
  amount,
  appointmentId
}) => {
  const { practiceSettings, appointments, updateAppointment, addPayment } = useAgendaStore();

  const [selectedMethod, setSelectedMethod] = useState<'alias_cbu' | 'mercadopago_link'>('mercadopago_link');
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [copiedCbu, setCopiedCbu] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [dynamicMpLink, setDynamicMpLink] = useState<string>('');
  const [mpPreferenceId, setMpPreferenceId] = useState<string>('');
  const [isSimulatedMp, setIsSimulatedMp] = useState(false);
  const [markedPaid, setMarkedPaid] = useState(false);

  // Settings fallbacks
  const alias = practiceSettings.patient_deposit_alias || 'consultorio.turnos.mp';
  const cbu = practiceSettings.patient_deposit_cbu || '0000003100092837461524';
  const bank = practiceSettings.patient_deposit_bank_name || 'Mercado Pago / Banco';
  const holder = practiceSettings.patient_deposit_account_holder || practiceSettings.practice_name || 'Titular de Cuenta';
  const staticMpLink = practiceSettings.patient_deposit_mp_link || 'https://mpago.la/consultorio';

  // Request dynamic preference from backend when modal is opened or amount changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const createPreference = async () => {
      setIsGeneratingLink(true);
      try {
        const res = await fetch('/api/mercadopago/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: concept ? `${concept} - ${patientName}` : `Consulta - ${patientName}`,
            amount: Number(amount),
            price: Number(amount),
            appointmentId: appointmentId || `apt-${Date.now()}`,
            patientName: patientName,
            patientPhone: patientPhone,
            accessToken: practiceSettings.patient_deposit_mp_token || practiceSettings.mercadopago_access_token
          })
        });
        const data = await res.json();
        if (isMounted && data.success) {
          setDynamicMpLink(data.init_point || data.sandbox_init_point || staticMpLink);
          setMpPreferenceId(data.preferenceId || '');
          setIsSimulatedMp(Boolean(data.simulated));
        }
      } catch (err) {
        console.error('Error generating dynamic Mercado Pago link:', err);
        if (isMounted) {
          setDynamicMpLink(staticMpLink);
        }
      } finally {
        if (isMounted) setIsGeneratingLink(false);
      }
    };

    createPreference();

    return () => {
      isMounted = false;
    };
  }, [isOpen, amount, appointmentId, patientName, concept, staticMpLink, practiceSettings.mercadopago_access_token, practiceSettings.patient_deposit_mp_token]);

  if (!isOpen) return null;

  const effectiveMpLink = dynamicMpLink || staticMpLink;

  // Construct message text based on method
  let messageText = '';
  if (selectedMethod === 'alias_cbu') {
    messageText = `Hola *${patientName}* 👋! Te enviamos los datos para realizar la transferencia de tu consulta de *${concept}* por $${amount.toLocaleString('es-AR')}:\n\n📌 *Alias:* ${alias}\n🏦 *Banco/Billetera:* ${bank}\n👤 *Titular:* ${holder}\n🔢 *CBU:* ${cbu}\n\nPor favor envíanos el comprobante de transferencia por aquí para registrar tu pago. ¡Muchas gracias!`;
  } else {
    messageText = `Hola *${patientName}* 👋! Podés abonar tu consulta de *${concept}* ($${amount.toLocaleString('es-AR')}) con tarjeta de crédito, débito o saldo en cuenta desde este link seguro de Mercado Pago con el monto precargado:\n\n🔗 ${effectiveMpLink}\n\nAl realizar el pago se registrará automáticamente en nuestro sistema. ¡Muchas gracias!`;
  }

  const cleanPhone = (patientPhone || '').replace(/\D/g, '');
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(effectiveMpLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyAlias = () => {
    navigator.clipboard.writeText(alias);
    setCopiedAlias(true);
    setTimeout(() => setCopiedAlias(false), 2000);
  };

  const handleCopyCbu = () => {
    navigator.clipboard.writeText(cbu);
    setCopiedCbu(true);
    setTimeout(() => setCopiedCbu(false), 2000);
  };

  const handleMarkAsPaid = () => {
    if (appointmentId) {
      updateAppointment(appointmentId, {
        payment_status: 'paid',
        payment_method: selectedMethod === 'alias_cbu' ? 'transfer' : 'mercadopago'
      });

      const apt = appointments.find(a => a.id === appointmentId);
      addPayment({
        patient_id: apt?.patient_id || '',
        patient_name: patientName,
        appointment_id: appointmentId,
        concept: concept || 'Consulta Médica',
        amount: Number(amount),
        method: selectedMethod === 'alias_cbu' ? 'transfer' : 'mercado_pago',
        notes: `Cobro registrado tras solicitar pago (${selectedMethod === 'mercadopago_link' ? 'Mercado Pago' : 'Transferencia Alias/CBU'})`
      });

      setMarkedPaid(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Solicitar Pago al Paciente</h2>
              <p className="text-xs text-neutral-500">Monto precargado de turno con confirmación directa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Summary Card */}
          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Paciente & Concepto</span>
              <span className="text-xs font-bold text-neutral-900 block mt-0.5">{patientName}</span>
              <span className="text-[11px] text-neutral-600 block">{concept}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Monto del Turno</span>
              <div className="flex items-center justify-end gap-1">
                <span className="text-base font-bold font-mono text-emerald-700">${amount.toLocaleString('es-AR')}</span>
                <span className="text-[10px] font-bold text-neutral-500">ARS</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-800 block">
              Selecciona el Medio de Cobro:
            </label>
            <div className="grid grid-cols-2 gap-3">
              
              <button
                type="button"
                onClick={() => setSelectedMethod('mercadopago_link')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer ${
                  selectedMethod === 'mercadopago_link'
                    ? 'bg-sky-50 border-sky-500 text-sky-950 ring-2 ring-sky-500/20 font-bold shadow-xs'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <CreditCard className={`w-5 h-5 ${selectedMethod === 'mercadopago_link' ? 'text-[#009ee3]' : 'text-neutral-400'}`} />
                <span className="text-xs font-semibold">Mercado Pago</span>
                <span className="text-[10px] text-neutral-500">Link con monto exacto</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('alias_cbu')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer ${
                  selectedMethod === 'alias_cbu'
                    ? 'bg-neutral-100 border-neutral-900 text-neutral-900 ring-2 ring-neutral-900/10 font-bold shadow-xs'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <Landmark className={`w-5 h-5 ${selectedMethod === 'alias_cbu' ? 'text-neutral-800' : 'text-neutral-400'}`} />
                <span className="text-xs font-semibold">Transferencia Bancaria</span>
                <span className="text-[10px] text-neutral-500">Alias o CBU</span>
              </button>

            </div>
          </div>

          {/* MERCADO PAGO LINK DISPLAY */}
          {selectedMethod === 'mercadopago_link' && (
            <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200 text-left space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#009ee3]" />
                  Checkout Seguro de Mercado Pago
                </span>
                {isGeneratingLink ? (
                  <span className="text-[10px] text-sky-700 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Generando link...
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-100 text-sky-800 border border-sky-200">
                    Monto precargado
                  </span>
                )}
              </div>

              <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={effectiveMpLink}
                    className="w-full text-xs font-mono text-neutral-700 bg-neutral-50 px-2.5 py-1.5 rounded-lg border border-neutral-200 focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500">
                  El paciente puede pagar con tarjeta de débito, crédito o dinero en cuenta.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <a
                  href={effectiveMpLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-white border border-sky-200 hover:bg-sky-50 rounded-xl transition flex items-center gap-1 shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Probar Link en Nueva Pestaña</span>
                </a>
              </div>
            </div>
          )}

          {/* ALIAS / CBU DISPLAY */}
          {selectedMethod === 'alias_cbu' && (
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-neutral-700" />
                  Datos Bancarios para Transferencia
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  0% Comisión
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-2 text-xs font-mono">
                {/* Alias row with copy button */}
                <div className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div>
                    <span className="text-[10px] text-neutral-500 font-sans block">Alias de la Cuenta:</span>
                    <span className="font-bold text-neutral-900">{alias}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAlias}
                    className="px-2.5 py-1 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 rounded-md text-xs font-sans font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    {copiedAlias ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAlias ? '¡Copiado!' : 'Copiar Alias'}</span>
                  </button>
                </div>

                {/* CBU row with copy button */}
                <div className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div>
                    <span className="text-[10px] text-neutral-500 font-sans block">CBU / CVU:</span>
                    <span className="font-bold text-neutral-900 text-[11px]">{cbu}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCbu}
                    className="px-2.5 py-1 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 rounded-md text-xs font-sans font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCbu ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCbu ? '¡Copiado!' : 'Copiar CBU'}</span>
                  </button>
                </div>

                <div className="flex justify-between text-[11px] pt-1">
                  <span className="text-neutral-500 font-sans">Titular:</span>
                  <span className="text-neutral-800 font-semibold">{holder}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-500 font-sans">Banco / Billetera:</span>
                  <span className="text-neutral-800 font-semibold">{bank}</span>
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-800">
                Mensaje de WhatsApp para el Paciente:
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copiedMessage ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedMessage ? '¡Texto Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>
            <div className="p-3 bg-neutral-900 text-emerald-400 rounded-xl font-mono text-[11px] whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto select-all">
              {messageText}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Enviar por WhatsApp</span>
            </a>

            {appointmentId && (
              <button
                type="button"
                onClick={handleMarkAsPaid}
                disabled={markedPaid}
                className="py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{markedPaid ? '¡Cobro Registrado!' : 'Marcar Pagado'}</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

