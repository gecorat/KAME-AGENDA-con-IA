import React, { useState, useEffect } from 'react';
import {
  X,
  Landmark,
  QrCode,
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
import { QRCodeSVG } from 'qrcode.react';
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

  const [selectedMethod, setSelectedMethod] = useState<'alias_cbu' | 'mercadopago_link' | 'qr_code'>('qr_code');
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
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
            accessToken: practiceSettings.mercadopago_access_token
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
          // Fallback to local link or static alias link
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
  }, [isOpen, amount, appointmentId, patientName, concept, staticMpLink, practiceSettings.mercadopago_access_token]);

  if (!isOpen) return null;

  const effectiveMpLink = dynamicMpLink || staticMpLink;

  // QR value: If QR is selected, use dynamic MP payment checkout link so scanning preloads the exact amount!
  // If Alias is selected, use link to alias
  const qrValue = selectedMethod === 'alias_cbu'
    ? `https://link.mercadopago.com.ar/${alias}`
    : effectiveMpLink;

  // Construct message text based on method
  let messageText = '';
  if (selectedMethod === 'alias_cbu') {
    messageText = `Hola *${patientName}* 👋! Te enviamos los datos para realizar la transferencia de tu consulta de *${concept}* por $${amount.toLocaleString('es-AR')}:\n\n📌 *Alias:* ${alias}\n🏦 *Banco/Billetera:* ${bank}\n👤 *Titular:* ${holder}\n🔢 *CBU:* ${cbu}\n\nPor favor envíanos el comprobante de transferencia por aquí para registrar tu pago. ¡Muchas gracias!`;
  } else if (selectedMethod === 'mercadopago_link') {
    messageText = `Hola *${patientName}* 👋! Podés abonar tu consulta de *${concept}* ($${amount.toLocaleString('es-AR')}) con tarjeta de crédito, débito o saldo en cuenta desde este link seguro de Mercado Pago con el monto precargado:\n\n🔗 ${effectiveMpLink}\n\nAl realizar el pago se registrará automáticamente en nuestro sistema. ¡Muchas gracias!`;
  } else {
    messageText = `Hola *${patientName}* 👋! Podés abonar tu consulta de *${concept}* ($${amount.toLocaleString('es-AR')}) escaneando el código QR de Mercado Pago o ingresando a este link de pago directo:\n\n🔗 ${effectiveMpLink}\n\nAl confirmar el pago tu turno quedará registrado. ¡Muchas gracias!`;
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

  // Direct manual mark as paid if patient scanned or paid on screen
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
        notes: `Cobro registrado tras solicitar pago (${selectedMethod === 'qr_code' ? 'QR dinámico' : selectedMethod === 'mercadopago_link' ? 'Link MP' : 'Transferencia'})`
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
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Solicitar Pago & Código QR Dinámico</h2>
              <p className="text-xs text-neutral-500">Monto precargado de turno con retorno y registro automático</p>
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
              Selecciona el Formato de Cobro:
            </label>
            <div className="grid grid-cols-3 gap-2">
              
              <button
                type="button"
                onClick={() => setSelectedMethod('qr_code')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer ${
                  selectedMethod === 'qr_code'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500/20 font-bold shadow-xs'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <QrCode className={`w-5 h-5 ${selectedMethod === 'qr_code' ? 'text-indigo-600' : 'text-neutral-400'}`} />
                <span className="text-xs">QR Dinámico MP</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('mercadopago_link')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer ${
                  selectedMethod === 'mercadopago_link'
                    ? 'bg-sky-50 border-sky-500 text-sky-950 ring-2 ring-sky-500/20 font-bold shadow-xs'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <CreditCard className={`w-5 h-5 ${selectedMethod === 'mercadopago_link' ? 'text-sky-600' : 'text-neutral-400'}`} />
                <span className="text-xs">Link con Retorno</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('alias_cbu')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer ${
                  selectedMethod === 'alias_cbu'
                    ? 'bg-neutral-100 border-neutral-900 text-neutral-900 ring-2 ring-neutral-900/10 font-bold shadow-xs'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <Landmark className={`w-5 h-5 ${selectedMethod === 'alias_cbu' ? 'text-neutral-800' : 'text-neutral-400'}`} />
                <span className="text-xs">Alias / CBU</span>
              </button>

            </div>
          </div>

          {/* DYNAMIC QR CODE DISPLAY */}
          {selectedMethod === 'qr_code' && (
            <div className="p-4 bg-gradient-to-b from-indigo-50/70 to-neutral-50 rounded-2xl border border-indigo-200/90 text-center flex flex-col items-center justify-center space-y-3 shadow-2xs">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Código QR Dinámico Mercado Pago
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  ${amount.toLocaleString('es-AR')} ARS
                </span>
              </div>

              {/* QR Container */}
              <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-sm relative group">
                {isGeneratingLink ? (
                  <div className="w-44 h-44 flex flex-col items-center justify-center gap-2 text-neutral-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                    <span className="text-[11px] font-medium">Generando QR con monto...</span>
                  </div>
                ) : (
                  <QRCodeSVG
                    value={qrValue}
                    size={176}
                    level="M"
                    marginSize={2}
                    className="w-44 h-44 mx-auto rounded-lg"
                  />
                )}
              </div>

              <div className="space-y-1 max-w-sm">
                <p className="text-xs font-semibold text-neutral-800">
                  Escaneá con la app de Mercado Pago, MODO o la cámara de tu celular
                </p>
                <p className="text-[11px] text-neutral-500 leading-normal">
                  El monto de <strong>${amount.toLocaleString('es-AR')} ARS</strong> ya está precargado. Al pagar, el estado se actualiza automáticamente.
                </p>
              </div>

              {/* Action buttons for QR */}
              <div className="flex items-center gap-2 pt-1 w-full justify-center">
                <a
                  href={effectiveMpLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-xl transition flex items-center gap-1 shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Checkout</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-xl transition flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? '¡Link Copiado!' : 'Copiar Link del QR'}</span>
                </button>
              </div>
            </div>
          )}

          {/* DYNAMIC MERCADO PAGO LINK DISPLAY */}
          {selectedMethod === 'mercadopago_link' && (
            <div className="p-4 bg-sky-50/70 rounded-2xl border border-sky-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                  Link Dinámico de Mercado Pago
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-100 text-sky-800">
                  Retorno Automático
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={isGeneratingLink ? 'Generando link dinámico...' : effectiveMpLink}
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl font-mono text-neutral-700 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-sky-900 pt-1">
                <span>Monto precargado: <strong>${amount.toLocaleString('es-AR')} ARS</strong></span>
                <a
                  href={effectiveMpLink}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline flex items-center gap-0.5 hover:text-sky-950"
                >
                  Probar Checkout en nueva pestaña <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* ALIAS / CBU DISPLAY */}
          {selectedMethod === 'alias_cbu' && (
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
                <span className="text-neutral-500">Alias:</span>
                <span className="font-mono font-bold text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200">
                  {alias}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-200">
                <span className="text-neutral-500">CBU:</span>
                <span className="font-mono text-neutral-800">{cbu}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-500">Banco / Billetera:</span>
                <span className="font-semibold text-neutral-800">{bank}</span>
              </div>
            </div>
          )}

          {/* Message Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                <span>Mensaje listo para enviar por WhatsApp:</span>
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                {copiedMessage ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedMessage ? '¡Copiado!' : 'Copiar texto'}</span>
              </button>
            </div>

            <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl font-sans text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed shadow-2xs max-h-32 overflow-y-auto">
              {messageText}
            </div>
          </div>

          {/* Immediate Mark Paid action */}
          {appointmentId && (
            <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-neutral-800">¿El paciente ya pagó en este momento?</p>
                <p className="text-[11px] text-neutral-500">Podés marcar el turno como cobrado y generar el recibo al instante.</p>
              </div>
              <button
                type="button"
                onClick={handleMarkAsPaid}
                disabled={markedPaid}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {markedPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                <span>{markedPaid ? '¡Registrado!' : 'Registrar Cobro'}</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMessage ? 'Copiado' : 'Copiar Mensaje'}</span>
            </button>

            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar por WhatsApp</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
