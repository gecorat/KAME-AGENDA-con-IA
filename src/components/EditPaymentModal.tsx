import React, { useState, useEffect } from 'react';
import { X, DollarSign, User, FileText, CreditCard, Landmark, QrCode, Shield, Check, Calendar, AlertTriangle } from 'lucide-react';
import { PaymentRecord, PaymentMethod, Patient } from '../types';
import { useAgendaStore } from '../lib/store';

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentRecord | null;
  onPaymentUpdated?: (updated: PaymentRecord) => void;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  isOpen,
  onClose,
  payment,
  onPaymentUpdated
}) => {
  const { updatePayment, patients } = useAgendaStore();

  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [concept, setConcept] = useState<string>('');
  const [serviceName, setServiceName] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [patientDni, setPatientDni] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [insuranceProvider, setInsuranceProvider] = useState<string>('');
  const [copayAmount, setCopayAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    if (payment) {
      setAmount(payment.amount || 0);
      setMethod(payment.method || 'cash');
      setConcept(payment.concept || '');
      setServiceName(payment.service_name || '');
      setPatientName(payment.patient_name || '');
      setPatientDni(payment.patient_dni || '');
      setPatientPhone(payment.patient_phone || '');
      setInsuranceProvider(payment.insurance_provider || '');
      setCopayAmount(payment.copay_amount || 0);
      setNotes(payment.notes || '');
      setDate(payment.date ? new Date(payment.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    }
  }, [payment, isOpen]);

  if (!isOpen || !payment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (amount <= 0) {
      alert('El monto del cobro debe ser mayor a $0.');
      return;
    }

    const updates: Partial<PaymentRecord> = {
      amount: Number(amount),
      method,
      concept: concept.trim() || 'Consulta Profesional',
      service_name: serviceName.trim() || undefined,
      patient_name: patientName.trim(),
      patient_dni: patientDni.trim() || undefined,
      patient_phone: patientPhone.trim() || undefined,
      insurance_provider: method === 'insurance' ? insuranceProvider.trim() : undefined,
      copay_amount: method === 'insurance' && copayAmount > 0 ? Number(copayAmount) : undefined,
      notes: notes.trim() || undefined,
      date: date ? new Date(date).toISOString() : payment.date
    };

    updatePayment(payment.id, updates);

    if (onPaymentUpdated) {
      onPaymentUpdated({ ...payment, ...updates });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              $
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Editar Cobro / Recibo {payment.receipt_number}</h2>
              <p className="text-xs text-neutral-500">Modifica los datos del comprobante y actualiza las estadísticas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Patient info */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
            <label className="text-xs font-semibold text-neutral-700 block">Titular del Cobro</label>
            <input
              type="text"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              placeholder="Nombre del paciente / cliente"
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={patientDni}
                onChange={e => setPatientDni(e.target.value)}
                placeholder="DNI / CUIT (Opcional)"
                className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="text"
                value={patientPhone}
                onChange={e => setPatientPhone(e.target.value)}
                placeholder="Teléfono (Opcional)"
                className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Concept */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">Concepto / Arancel</label>
            <input
              type="text"
              value={concept}
              onChange={e => setConcept(e.target.value)}
              placeholder="Ej: Consulta Odontológica, Tratamiento de Conducto"
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">Monto Cobrado ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-neutral-400 font-bold text-sm">$</span>
                <input
                  type="number"
                  value={amount === 0 ? '' : amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2 text-base font-bold font-mono text-neutral-900 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">Fecha y Hora</label>
              <input
                type="datetime-local"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-2">Medio de Pago</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                  method === 'cash'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('transfer')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                  method === 'transfer'
                    ? 'border-sky-500 bg-sky-50 text-sky-900 ring-2 ring-sky-500/20'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <Landmark className="w-4 h-4 text-sky-600" />
                <span>Transferencia</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('mercado_pago')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                  method === 'mercado_pago'
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-500/20'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <QrCode className="w-4 h-4 text-cyan-600" />
                <span>Mercado Pago</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('card_debit')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                  method === 'card_debit'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>Tarjeta Débito</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('card_credit')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                  method === 'card_credit'
                    ? 'border-purple-500 bg-purple-50 text-purple-900 ring-2 ring-purple-500/20'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <CreditCard className="w-4 h-4 text-purple-600" />
                <span>Tarjeta Crédito</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('insurance')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                  method === 'insurance'
                    ? 'border-teal-500 bg-teal-50 text-teal-900 ring-2 ring-teal-500/20'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <Shield className="w-4 h-4 text-teal-600" />
                <span>Obra Social</span>
              </button>
            </div>
          </div>

          {/* If insurance */}
          {method === 'insurance' && (
            <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200 space-y-2">
              <input
                type="text"
                placeholder="Nombre de Obra Social / Prepaga (ej. OSDE, Swiss Medical)"
                value={insuranceProvider}
                onChange={e => setInsuranceProvider(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
              <input
                type="number"
                placeholder="Copago abonado por paciente en efectivo/tarjeta ($)"
                value={copayAmount === 0 ? '' : copayAmount}
                onChange={e => setCopayAmount(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">Observaciones / Notas del Cobro</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Detalles adicionales, número de transacción bancaria o notas..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Notice */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-2 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Al guardar los cambios, las estadísticas de facturación y el arqueo de caja se actualizarán automáticamente.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Guardar Modificaciones
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
