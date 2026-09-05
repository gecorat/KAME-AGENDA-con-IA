import React from 'react';
import { X, Printer, MessageSquare, CheckCircle, AlertTriangle, Building2, User, Calendar, CreditCard, Copy, Check } from 'lucide-react';
import { PaymentRecord } from '../types';
import { useAgendaStore } from '../lib/store';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentRecord | null;
  onVoid?: (paymentId: string) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  onVoid
}) => {
  const { practiceSettings } = useAgendaStore();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !payment) return null;

  const isVoided = payment.status === 'voided';

  const formatMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Efectivo en mano';
      case 'transfer': return 'Transferencia Bancaria';
      case 'mercado_pago': return 'Mercado Pago / QR';
      case 'card_debit': return 'Tarjeta de Débito';
      case 'card_credit': return 'Tarjeta de Crédito';
      case 'insurance': return `Obra Social (${payment.insurance_provider || 'Cobertura'})`;
      default: return method;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const phone = (payment.patient_phone || '').replace(/\D/g, '');
    const dateFormatted = new Date(payment.date).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const text = `Hola ${payment.patient_name}, le compartimos el comprobante de pago de su consulta en *${practiceSettings.practice_name}*:\n\n` +
      `🧾 *Comprobante:* ${payment.receipt_number}\n` +
      `📅 *Fecha:* ${dateFormatted}\n` +
      `🩺 *Concepto:* ${payment.concept}\n` +
      `💳 *Forma de Pago:* ${formatMethodLabel(payment.method)}\n` +
      `💰 *Total Abonado:* $${payment.amount.toLocaleString('es-AR')}\n\n` +
      `Muchas gracias por su confianza.\n${practiceSettings.professional_name}`;

    const waUrl = phone 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyText = () => {
    const text = `Comprobante ${payment.receipt_number} | ${practiceSettings.practice_name}\n` +
      `Paciente: ${payment.patient_name} (${payment.patient_dni || 'Sin DNI'})\n` +
      `Concepto: ${payment.concept}\n` +
      `Total: $${payment.amount.toLocaleString('es-AR')} (${formatMethodLabel(payment.method)})\n` +
      `Fecha: ${new Date(payment.date).toLocaleString('es-AR')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-neutral-200 print:border-none print:shadow-none animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar (Hidden during printing) */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
              {payment.receipt_number}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isVoided ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {isVoided ? 'ANULADO' : 'COBRADO'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-lg transition-colors"
              title="Imprimir comprobante"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopyText}
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-lg transition-colors"
              title="Copiar datos del recibo"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Canvas */}
        <div className="p-6 md:p-8 print:p-0 space-y-6">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b border-neutral-200 pb-5">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">{practiceSettings.practice_name}</h2>
              <p className="text-xs text-neutral-600 font-medium">{practiceSettings.professional_name}</p>
              <p className="text-xs text-neutral-500">{practiceSettings.professional_title}</p>
              <p className="text-xs text-neutral-500 mt-1">{practiceSettings.address}, {practiceSettings.city}</p>
              <p className="text-xs text-neutral-500">Tel: {practiceSettings.phone} • WhatsApp: {practiceSettings.whatsapp_number}</p>
            </div>
            <div className="text-right">
              <div className="inline-block bg-neutral-100 px-3 py-1.5 rounded-lg text-right">
                <span className="block text-[10px] uppercase font-bold text-neutral-500">Recibo Oficial</span>
                <span className="font-mono text-sm font-bold text-neutral-900">{payment.receipt_number}</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-2">
                Fecha: {new Date(payment.date).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </p>
              <p className="text-[11px] text-neutral-500 font-mono">
                Hora: {new Date(payment.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
              </p>
            </div>
          </div>

          {/* Voided Banner if applicable */}
          {isVoided && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>ESTE COMPROBANTE HA SIDO ANULADO. No tiene validez contable ni fiscal.</span>
            </div>
          )}

          {/* Patient Details */}
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 space-y-2">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Datos del Paciente
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-neutral-500 block">Nombre y Apellido:</span>
                <span className="font-semibold text-neutral-900">{payment.patient_name}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">DNI / Identificación:</span>
                <span className="font-semibold text-neutral-900">{payment.patient_dni || 'Consumidor Final'}</span>
              </div>
              {payment.patient_phone && (
                <div>
                  <span className="text-neutral-500 block">Teléfono / Móvil:</span>
                  <span className="font-semibold text-neutral-900">{payment.patient_phone}</span>
                </div>
              )}
              {payment.insurance_provider && (
                <div>
                  <span className="text-neutral-500 block">Obra Social / Prepaga:</span>
                  <span className="font-semibold text-neutral-900">{payment.insurance_provider}</span>
                </div>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-100 text-neutral-600 uppercase font-semibold text-[11px] border-b border-neutral-200">
                <tr>
                  <th className="py-2.5 px-4">Descripción del Concepto</th>
                  <th className="py-2.5 px-4 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="py-3 px-4">
                    <p className="font-medium text-neutral-900">{payment.concept}</p>
                    {payment.service_name && payment.service_name !== payment.concept && (
                      <p className="text-[11px] text-neutral-500 mt-0.5">{payment.service_name}</p>
                    )}
                    {payment.notes && (
                      <p className="text-[11px] text-neutral-400 italic mt-0.5">{payment.notes}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-neutral-900 font-mono text-sm">
                    ${payment.amount.toLocaleString('es-AR')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary / Total */}
          <div className="space-y-2 border-t border-neutral-200 pt-4">
            <div className="flex justify-between text-xs text-neutral-600">
              <span>Método de pago utilizado:</span>
              <span className="font-semibold text-neutral-900">{formatMethodLabel(payment.method)}</span>
            </div>
            {payment.copay_amount ? (
              <div className="flex justify-between text-xs text-neutral-600">
                <span>Copago / Coseguro paciente:</span>
                <span className="font-semibold text-neutral-900 font-mono">${payment.copay_amount.toLocaleString('es-AR')}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-base font-bold text-neutral-900 pt-2 border-t border-neutral-200">
              <span>Total Pagado:</span>
              <span className="font-mono text-lg text-emerald-700">
                ${payment.amount.toLocaleString('es-AR')} {practiceSettings.currency}
              </span>
            </div>
          </div>

          {/* Legal / Thank you footer */}
          <div className="text-center pt-4 border-t border-dashed border-neutral-200 text-[11px] text-neutral-400">
            <p>Comprobante no válido como factura fiscal (Documento de control interno de consultorio).</p>
            <p className="mt-0.5">¡Gracias por atenderse con nosotros!</p>
          </div>
        </div>

        {/* Modal Actions Footer (Hidden in print) */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            {!isVoided && onVoid && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`¿Está seguro de que desea anular el recibo ${payment.receipt_number}?`)) {
                    onVoid(payment.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg font-medium transition-colors"
              >
                Anular Recibo
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Enviar Comprobante por WhatsApp
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-200 hover:bg-neutral-100 rounded-xl text-xs font-semibold text-neutral-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
