import React, { useState } from 'react';
import {
  Building2,
  Copy,
  Check,
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useAgendaStore } from '../../lib/store';
import { SubscriptionPlanId, BillingCycle } from '../../types';

interface BankTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: SubscriptionPlanId;
  billingCycle: BillingCycle;
  amount: number;
}

export const BankTransferModal: React.FC<BankTransferModalProps> = ({
  isOpen,
  onClose,
  planId,
  billingCycle,
  amount
}) => {
  const { practiceSettings, submitSaasTransfer, currentUser } = useAgendaStore();

  const [referenceNumber, setReferenceNumber] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceNumber.trim()) return;

    setIsSubmitting(true);
    try {
      await submitSaasTransfer({
        tenant_id: practiceSettings.id || 'default_tenant',
        doctor_name: practiceSettings.professional_name || currentUser?.name || 'Dr. Usuario',
        practice_name: practiceSettings.practice_name || 'Consultorio Médico',
        email: practiceSettings.email || currentUser?.email || 'doctor@ejemplo.com',
        phone: practiceSettings.phone || '',
        plan: planId,
        billing_cycle: billingCycle,
        amount: amount,
        currency: 'ARS',
        reference_number: referenceNumber.trim(),
        transfer_date: transferDate,
        receipt_url: receiptUrl,
        notes: notes.trim()
      });

      setSubmittedSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const bankName = practiceSettings.bank_name || 'Banco Santander';
  const holder = practiceSettings.bank_account_holder || 'Gonzalo Corat';
  const cbu = practiceSettings.bank_cbu || '0000003100010000000000';
  const alias = practiceSettings.bank_alias || 'agenfacil.saas.mp';
  const cuit = practiceSettings.bank_cuit_cuil || '20-35448899-7';
  const instructions = practiceSettings.bank_transfer_instructions || 'Acreditación y activación en menos de 2 horas tras verificar comprobante.';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl border border-neutral-200 space-y-5 animate-scale-up max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Pago por Transferencia Bancaria
              </h3>
              <p className="text-[11px] text-neutral-500">
                Plan {planId === 'pro' ? 'Pro AI' : 'Básico'} ({billingCycle === 'annual' ? 'Anual' : 'Mensual'}) • ${amount.toLocaleString('es-AR')} ARS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submittedSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-neutral-900">
                ¡Comprobante Registrado con Éxito!
              </h4>
              <p className="text-xs text-neutral-600 max-w-md mx-auto leading-relaxed">
                Hemos recibido tu comprobante con el número de operación <strong>{referenceNumber}</strong>. El equipo administrativo revisará y activará tu plan a la brevedad.
              </p>
            </div>
            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-[11px] text-emerald-800 text-left space-y-1 max-w-sm mx-auto">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Activación Garantizada</span>
              </div>
              <p>Tu servicio se mantiene activo y recibirás una confirmación en pantalla en cuanto se apruebe el registro.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-neutral-800 cursor-pointer"
            >
              Entendido, volver a mi panel
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* 1. Datos de la cuenta para transferir */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Datos de la cuenta receptora:
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  0% Comisión
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-white rounded-xl border border-neutral-200">
                  <span className="text-neutral-400 block text-[10px]">Banco:</span>
                  <span className="font-semibold text-neutral-800">{bankName}</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-neutral-200">
                  <span className="text-neutral-400 block text-[10px]">Titular:</span>
                  <span className="font-semibold text-neutral-800">{holder}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-neutral-200">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Alias:</span>
                    <span className="font-mono font-bold text-emerald-700 text-xs">{alias}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(alias, 'alias')}
                    className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'alias' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'alias' ? 'Copiado' : 'Copiar Alias'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-neutral-200">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">CBU / CVU:</span>
                    <span className="font-mono font-bold text-neutral-800 text-xs">{cbu}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(cbu, 'cbu')}
                    className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'cbu' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'cbu' ? 'Copiado' : 'Copiar CBU'}</span>
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-neutral-500 italic">
                {instructions}
              </p>
            </div>

            {/* 2. Carga de comprobante */}
            <div className="space-y-3">
              <span className="font-bold text-neutral-900 block">
                Adjunta tu comprobante de transferencia:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Nº de Transacción / Operación: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. OP-983421 / 009283"
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Fecha de la Transferencia:
                  </label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={e => setTransferDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 text-xs"
                  />
                </div>
              </div>

              {/* File upload */}
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">
                  Foto o Archivo del Comprobante (opcional pero recomendado):
                </label>
                <label className="border-2 border-dashed border-neutral-200 hover:border-neutral-400 bg-neutral-50/70 p-3 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition text-center">
                  <UploadCloud className="w-6 h-6 text-neutral-400 mb-1" />
                  <span className="font-semibold text-neutral-700 text-xs">
                    {fileName ? fileName : 'Selecciona o arrastra una imagen/captura'}
                  </span>
                  <span className="text-[10px] text-neutral-400 mt-0.5">
                    JPG, PNG o comprobante bancario
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">
                  Notas o Aclaraciones (opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej. Transferí desde cuenta a nombre de..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !referenceNumber.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? 'Enviando comprobante...' : 'Enviar Comprobante para Verificación'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
