import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  FileText,
  AlertCircle,
  MessageSquare,
  Mail,
  Calendar,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Copy,
  Send,
  Check,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAgendaStore } from '../../lib/store';
import { PracticeSettings, SaasTransferSubmission } from '../../types';

interface SaasTransferSubmissionsManagerProps {
  formData: PracticeSettings;
  handleChange: (field: keyof PracticeSettings, value: any) => void;
}

export const SaasTransferSubmissionsManager: React.FC<SaasTransferSubmissionsManagerProps> = ({
  formData,
  handleChange
}) => {
  const {
    saasTransfers,
    saasTenants,
    approveSaasTransfer,
    rejectSaasTransfer,
    recordTenantReminderSent
  } = useAgendaStore();

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceiptTransfer, setSelectedReceiptTransfer] = useState<SaasTransferSubmission | null>(null);

  // Approval Modal
  const [approvingTransfer, setApprovingTransfer] = useState<SaasTransferSubmission | null>(null);
  const [approvalDays, setApprovalDays] = useState<number>(30);
  const [isApproving, setIsApproving] = useState(false);

  // Rejection Modal
  const [rejectingTransfer, setRejectingTransfer] = useState<SaasTransferSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Comprobante ilegible o importe no coincidente con el plan.');
  const [isRejecting, setIsRejecting] = useState(false);

  // Reminder Modal
  const [reminderTransfer, setReminderTransfer] = useState<SaasTransferSubmission | null>(null);
  const [reminderMethod, setReminderMethod] = useState<'whatsapp' | 'email'>('whatsapp');
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState<string | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredTransfers = saasTransfers.filter(t => {
    const matchesFilter = filterStatus === 'all' || t.status === filterStatus;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (t.doctor_name || '').toLowerCase().includes(term) ||
      (t.practice_name || '').toLowerCase().includes(term) ||
      (t.email || '').toLowerCase().includes(term) ||
      (t.reference_number || '').toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  const pendingCount = saasTransfers.filter(t => t.status === 'pending').length;
  const approvedCount = saasTransfers.filter(t => t.status === 'approved').length;
  const totalCollectedTransfers = saasTransfers
    .filter(t => t.status === 'approved')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const handleConfirmApproval = async () => {
    if (!approvingTransfer) return;
    setIsApproving(true);
    try {
      await approveSaasTransfer(approvingTransfer.id, approvalDays);
      confetti({ particleCount: 70, spread: 70 });
      setApprovingTransfer(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsApproving(false);
    }
  };

  const handleConfirmRejection = async () => {
    if (!rejectingTransfer) return;
    setIsRejecting(true);
    try {
      await rejectSaasTransfer(rejectingTransfer.id, rejectionReason);
      setRejectingTransfer(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleSendReminder = async () => {
    if (!reminderTransfer) return;
    setReminderSending(true);

    const targetTenant = saasTenants.find(
      t => t.id === reminderTransfer.tenant_id || t.email.toLowerCase() === reminderTransfer.email.toLowerCase()
    );

    const cleanPhone = (reminderTransfer.phone || targetTenant?.phone || '').replace(/\D/g, '');
    const doctorName = reminderTransfer.doctor_name || 'Doctor/a';
    const planName = reminderTransfer.plan === 'pro' ? 'Plan Pro AI' : 'Plan Básico';
    const amountStr = `$${reminderTransfer.amount.toLocaleString('es-AR')}`;
    const alias = formData.bank_alias || 'agenfacil.saas.mp';
    const cbu = formData.bank_cbu || '0000003100010000000000';
    const bank = formData.bank_name || 'Banco Central';
    const holder = formData.bank_account_holder || 'Gonzalo Corat';

    if (reminderMethod === 'whatsapp') {
      const message = `Hola ${doctorName}, te contactamos desde Agenfacil para recordarte el vencimiento de tu suscripción ${planName}.\n\nPara mantener tus reservas y el bot de WhatsApp activos, puedes realizar la transferencia de renovación por ${amountStr}.\n\n*Datos Bancarios:*\n• Banco: ${bank}\n• Alias: ${alias}\n• CBU/CVU: ${cbu}\n• Titular: ${holder}\n\nUna vez realizada, envíanos el comprobante por aquí o súbelo en tu panel. ¡Muchas gracias!`;
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');

      if (targetTenant) {
        await recordTenantReminderSent(targetTenant.id);
      }

      setReminderSuccess(`Recordatorio de WhatsApp abierto para ${doctorName}`);
      setReminderSending(false);
      setTimeout(() => {
        setReminderTransfer(null);
        setReminderSuccess(null);
      }, 1500);
    } else {
      // Email reminder
      try {
        await fetch('/api/reminders/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: reminderTransfer.email,
            patientName: doctorName,
            practiceName: 'Agenfacil Plataforma Médica',
            date: 'Próximamente',
            time: '00:00',
            serviceName: `Renovación ${planName}`,
            modality: 'online',
            address: `Alias: ${alias} | CBU: ${cbu} (${bank})`,
            resendApiKey: formData.email_resend_api_key,
            senderEmail: formData.email_sender_address
          })
        });

        if (targetTenant) {
          await recordTenantReminderSent(targetTenant.id);
        }

        setReminderSuccess(`¡Email de recordatorio despachado a ${reminderTransfer.email}!`);
      } catch (err) {
        setReminderSuccess('Error al despachar email de recordatorio.');
      } finally {
        setReminderSending(false);
        setTimeout(() => {
          setReminderTransfer(null);
          setReminderSuccess(null);
        }, 1800);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. CONFIGURACIÓN DE CUENTA BANCARIA PARA TRANSFERENCIAS */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-neutral-900">
                  1. Datos Bancarios para Suscripción Directa (CBU / Alias)
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Sin Comisiones
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Estos son los datos oficiales que verán los médicos en la pantalla de pago al elegir transferencia bancaria.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-semibold text-neutral-700 block mb-1">
              Nombre del Banco o Billetera:
            </label>
            <input
              type="text"
              value={formData.bank_name || ''}
              onChange={e => handleChange('bank_name', e.target.value)}
              placeholder="Banco Santander / Mercado Pago / Galicia"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 text-xs font-medium"
            />
          </div>

          <div>
            <label className="font-semibold text-neutral-700 block mb-1">
              Titular de la Cuenta:
            </label>
            <input
              type="text"
              value={formData.bank_account_holder || ''}
              onChange={e => handleChange('bank_account_holder', e.target.value)}
              placeholder="Gonzalo Corat"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 text-xs font-medium"
            />
          </div>

          <div>
            <label className="font-semibold text-neutral-700 block mb-1">
              CUIT / CUIL del Titular:
            </label>
            <input
              type="text"
              value={formData.bank_cuit_cuil || ''}
              onChange={e => handleChange('bank_cuit_cuil', e.target.value)}
              placeholder="20-35448899-7"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-neutral-700 block mb-1">
              Alias Bancario:
            </label>
            <input
              type="text"
              value={formData.bank_alias || ''}
              onChange={e => handleChange('bank_alias', e.target.value)}
              placeholder="agenfacil.saas.mp"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs font-bold text-emerald-800"
            />
          </div>

          <div>
            <label className="font-semibold text-neutral-700 block mb-1">
              CBU / CVU (22 Dígitos):
            </label>
            <input
              type="text"
              value={formData.bank_cbu || ''}
              onChange={e => handleChange('bank_cbu', e.target.value)}
              placeholder="0000003100010000000000"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-neutral-700 block mb-1">
              Tiempo Estimado de Acreditación:
            </label>
            <input
              type="text"
              value={formData.bank_transfer_instructions || ''}
              onChange={e => handleChange('bank_transfer_instructions', e.target.value)}
              placeholder="Inmediata / Aprobación en menos de 2 horas"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {/* 2. BANDEJA DE TRANSFERENCIAS & COMPROBANTES DE MÉDICOS */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-neutral-900">
                  2. Bandeja de Comprobantes & Aprobaciones Manuales
                </h4>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                    {pendingCount} pendientes
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500">
                Revisa los comprobantes enviados por los doctores, confirma su pago y activa su acceso con registro de fecha y vencimiento.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-neutral-50 border border-neutral-200 text-right">
              <span className="text-[10px] text-neutral-400 block font-mono">Recaudado Directo</span>
              <span className="text-xs font-bold text-neutral-900 font-mono">
                ${totalCollectedTransfers.toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Todos ({saasTransfers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                filterStatus === 'pending'
                  ? 'bg-amber-500 text-neutral-950 shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span>Pendientes</span>
              <span className="px-1.5 py-0.2 bg-amber-700 text-white rounded-full text-[10px]">
                {pendingCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('approved')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                filterStatus === 'approved'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Aprobados ({approvedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('rejected')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                filterStatus === 'rejected'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              Rechazados
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por médico o referencia..."
              className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 text-xs"
            />
          </div>
        </div>

        {/* List of Transfer Submissions */}
        {filteredTransfers.length === 0 ? (
          <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
            <Building2 className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-neutral-700">No hay transferencias registradas en este filtro</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Cuando un cliente pague por transferencia bancaria y adjunte su comprobante, aparecerá inmediatamente aquí para tu confirmación.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransfers.map(trans => {
              const targetTenant = saasTenants.find(
                t => t.id === trans.tenant_id || t.email.toLowerCase() === trans.email.toLowerCase()
              );
              const isPending = trans.status === 'pending';
              const isApproved = trans.status === 'approved';
              const isRejected = trans.status === 'rejected';

              return (
                <div
                  key={trans.id}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isPending
                      ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                      : isApproved
                        ? 'bg-white border-emerald-200'
                        : 'bg-neutral-50 border-neutral-200 opacity-70'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-neutral-900">
                        {trans.doctor_name}
                      </span>
                      <span className="text-xs text-neutral-500 font-medium">
                        ({trans.practice_name})
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        trans.plan === 'pro'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-neutral-100 text-neutral-800 border-neutral-200'
                      }`}>
                        Plan {trans.plan === 'pro' ? 'Pro AI' : 'Básico'} ({trans.billing_cycle === 'annual' ? 'Anual' : 'Mensual'})
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPending
                          ? 'bg-amber-200 text-amber-900 animate-pulse'
                          : isApproved
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isPending ? 'Pendiente Revisión' : isApproved ? 'Aprobado & Activo' : 'Rechazado'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-neutral-600">
                      <div>
                        <span className="text-neutral-400 block">Monto Transferido:</span>
                        <span className="font-bold text-neutral-900 font-mono text-xs">
                          ${trans.amount.toLocaleString('es-AR')} {trans.currency}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block">Nº Operación / Ref:</span>
                        <span className="font-mono font-semibold text-neutral-800">
                          {trans.reference_number}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block">Fecha Transferencia:</span>
                        <span className="font-medium text-neutral-800">
                          {trans.transfer_date}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block">Vencimiento / Renovación:</span>
                        <span className="font-semibold text-sky-800">
                          {targetTenant?.next_billing_date || 'Calculado al aprobar'}
                        </span>
                      </div>
                    </div>

                    {trans.notes && (
                      <p className="text-[11px] text-neutral-600 bg-white/80 p-2 rounded-xl border border-neutral-200/80 italic">
                        "{trans.notes}"
                      </p>
                    )}

                    {isApproved && trans.reviewed_by && (
                      <p className="text-[10px] text-emerald-700 font-medium">
                        ✓ Aprobado por {trans.reviewed_by} el {trans.reviewed_at ? new Date(trans.reviewed_at).toLocaleDateString('es-AR') : ''}
                      </p>
                    )}

                    {isRejected && trans.rejection_reason && (
                      <p className="text-[10px] text-rose-700 font-medium">
                        ✕ Rechazado: {trans.rejection_reason}
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center flex-wrap">
                    {/* View Receipt Proof */}
                    {trans.receipt_url && (
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptTransfer(trans)}
                        className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Comprobante</span>
                      </button>
                    )}

                    {/* Pending actions */}
                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setApprovingTransfer(trans);
                            setApprovalDays(trans.billing_cycle === 'annual' ? 365 : 30);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aprobar y Activar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRejectingTransfer(trans)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rechazar</span>
                        </button>
                      </>
                    )}

                    {/* Reminder button for renewals / contact */}
                    <button
                      type="button"
                      onClick={() => setReminderTransfer(trans)}
                      className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                      title="Enviar recordatorio de pago o renovación"
                    >
                      <Send className="w-3.5 h-3.5 text-sky-600" />
                      <span>Recordar Vencimiento</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* APPROVAL MODAL */}
      {approvingTransfer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-neutral-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Confirmar Aprobación de Transferencia
                </h3>
              </div>
              <button
                onClick={() => setApprovingTransfer(null)}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs space-y-1 text-emerald-950">
              <span className="font-bold block">
                {approvingTransfer.doctor_name} ({approvingTransfer.practice_name})
              </span>
              <p className="text-[11px] text-emerald-800">
                Plan solicitado: <strong>Plan {approvingTransfer.plan.toUpperCase()}</strong> • Monto: <strong>${approvingTransfer.amount.toLocaleString('es-AR')}</strong>
              </p>
              <p className="text-[11px] text-emerald-800 font-mono">
                Ref: {approvingTransfer.reference_number}
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Días de validez del servicio a otorgar:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setApprovalDays(30)}
                  className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer ${
                    approvalDays === 30
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  30 Días (1 Mes)
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalDays(90)}
                  className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer ${
                    approvalDays === 90
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  90 Días (3 Meses)
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalDays(365)}
                  className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer ${
                    approvalDays === 365
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  365 Días (1 Año)
                </button>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Al confirmar, el estado del consultorio pasará a <strong>Activo</strong> en Firestore, se registrará el ingreso en las métricas SaaS y la fecha de próximo vencimiento quedará fijada para dentro de {approvalDays} días.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setApprovingTransfer(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isApproving}
                onClick={handleConfirmApproval}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isApproving ? 'Activando...' : 'Confirmar y Activar Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {rejectingTransfer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-neutral-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Rechazar Comprobante de Transferencia
                </h3>
              </div>
              <button
                onClick={() => setRejectingTransfer(null)}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600">
              Indica el motivo por el cual no se pudo validar la transferencia de <strong>{rejectingTransfer.doctor_name}</strong>:
            </p>

            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Motivo de Rechazo:
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 text-xs leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setRejectingTransfer(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={isRejecting}
                onClick={handleConfirmRejection}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                {isRejecting ? 'Rechazando...' : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REMINDER MODAL */}
      {reminderTransfer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-neutral-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                  <Send className="w-5 h-5 text-sky-600" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Recordatorio de Vencimiento / Pago
                </h3>
              </div>
              <button
                onClick={() => setReminderTransfer(null)}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs space-y-1">
              <span className="font-bold text-neutral-900 block">
                {reminderTransfer.doctor_name} ({reminderTransfer.practice_name})
              </span>
              <p className="text-[11px] text-neutral-500">
                Email: {reminderTransfer.email} • Tel: {reminderTransfer.phone || 'No registrado'}
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Canal para enviar el recordatorio:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setReminderMethod('whatsapp')}
                  className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer flex items-center justify-center gap-2 ${
                    reminderMethod === 'whatsapp'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReminderMethod('email')}
                  className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer flex items-center justify-center gap-2 ${
                    reminderMethod === 'email'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Email Automático</span>
                </button>
              </div>
            </div>

            {reminderSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{reminderSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setReminderTransfer(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={reminderSending}
                onClick={handleSendReminder}
                className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {reminderSending ? 'Enviando...' : reminderMethod === 'whatsapp' ? 'Abrir WhatsApp' : 'Despachar Correo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT VIEWER MODAL */}
      {selectedReceiptTransfer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-neutral-200 space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-neutral-900">
                  Comprobante de {selectedReceiptTransfer.doctor_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceiptTransfer(null)}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-neutral-50 rounded-2xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">Monto:</span>
                <span className="font-bold text-neutral-900 font-mono">${selectedReceiptTransfer.amount.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Referencia:</span>
                <span className="font-mono font-bold text-neutral-800">{selectedReceiptTransfer.reference_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Fecha:</span>
                <span className="text-neutral-800">{selectedReceiptTransfer.transfer_date}</span>
              </div>
            </div>

            {selectedReceiptTransfer.receipt_url ? (
              <div className="rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 flex items-center justify-center p-2">
                <img
                  src={selectedReceiptTransfer.receipt_url}
                  alt="Comprobante Bancario"
                  className="max-h-96 w-auto object-contain rounded-xl shadow-xs"
                />
              </div>
            ) : (
              <p className="text-xs text-neutral-500 italic text-center py-6">
                No se adjuntó archivo de imagen para este registro.
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReceiptTransfer(null)}
                className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
