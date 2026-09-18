import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Building,
  Smartphone,
  Banknote,
  Clock,
  User,
  ShieldCheck,
  FileText,
  Tag,
  Sparkles,
  Award,
  AlertCircle
} from 'lucide-react';
import { Appointment, Patient, PaymentMethod } from '../types';
import { useAgendaStore } from '../lib/store';
import { formatArgentinaDisplayDate, parseArgentinaDate, getArgentinaTimeString } from '../lib/timezone';

interface PostAppointmentConfirmationModalProps {
  isOpen: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PostAppointmentConfirmationModal: React.FC<PostAppointmentConfirmationModalProps> = ({
  isOpen,
  appointment,
  onClose,
  onSuccess
}) => {
  const {
    patients,
    updatePatient,
    updateAppointment,
    addPayment,
    triggerNotification,
    practiceSettings
  } = useAgendaStore();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isPaid, setIsPaid] = useState(true);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [insurance, setInsurance] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoteToActive, setPromoteToActive] = useState(true);

  // Find linked patient
  const targetPatient = appointment
    ? patients.find(p => p.id === appointment.patient_id || (p.phone && appointment.patient_phone && p.phone.replace(/\D/g, '') === appointment.patient_phone.replace(/\D/g, '')))
    : null;

  const isProspect = targetPatient?.relationship_status === 'prospect' || (!targetPatient?.completed_appointments_count || targetPatient?.completed_appointments_count === 0);

  useEffect(() => {
    if (appointment) {
      const price = appointment.service_price || appointment.price || 0;
      setAmountPaid(price);
      setIsPaid(appointment.payment_status === 'paid' || true);
      setPaymentMethod('cash');
      setClinicalNotes(appointment.notes || '');
      setPromoteToActive(true);

      if (targetPatient) {
        setDni(targetPatient.dni || appointment.patient_dni || '');
        setEmail(targetPatient.email || appointment.patient_email || '');
        setInsurance(targetPatient.insurance_provider || targetPatient.insurance_company || appointment.patient_insurance || '');
      } else {
        setDni(appointment.patient_dni || '');
        setEmail(appointment.patient_email || '');
        setInsurance(appointment.patient_insurance || '');
      }
    }
  }, [appointment, targetPatient]);

  if (!isOpen || !appointment) return null;

  const appointmentDate = parseArgentinaDate(appointment.start_datetime);
  const dateStr = formatArgentinaDisplayDate(appointmentDate);
  const timeStr = getArgentinaTimeString(appointmentDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const nowIso = new Date().toISOString();

      // 1. Update Appointment
      updateAppointment(appointment.id, {
        status: 'completed',
        payment_status: isPaid ? 'paid' : appointment.payment_status,
        confirmed_payment_method: isPaid ? paymentMethod : undefined,
        post_completion_confirmed: true,
        post_completion_confirmed_at: nowIso,
        post_completion_notes: clinicalNotes
      });

      // 2. Register Payment if confirmed paid
      if (isPaid && amountPaid > 0) {
        addPayment({
          patient_id: appointment.patient_id || targetPatient?.id || 'pat-unknown',
          patient_name: appointment.patient_name,
          appointment_id: appointment.id,
          amount: Number(amountPaid),
          method: paymentMethod,
          concept: `Consulta: ${appointment.service_name} (${dateStr})`
        });
      }

      // 3. Update Patient details and promote to 'active'
      if (targetPatient) {
        const currentCompleted = targetPatient.completed_appointments_count || 0;
        updatePatient(targetPatient.id, {
          dni: dni.trim() || targetPatient.dni,
          email: email.trim() || targetPatient.email,
          insurance_provider: insurance.trim() || targetPatient.insurance_provider,
          relationship_status: promoteToActive ? 'active' : targetPatient.relationship_status,
          completed_appointments_count: currentCompleted + 1,
          notes: clinicalNotes ? (targetPatient.notes ? `${targetPatient.notes} | Cita ${dateStr}: ${clinicalNotes}` : clinicalNotes) : targetPatient.notes
        });
      }

      // 4. In-App Notification
      triggerNotification({
        type: 'test',
        title: '✅ Cita Finalizada y Validada',
        message: `Se confirmó la asistencia de ${appointment.patient_name}. Pago de $${Number(amountPaid).toLocaleString('es-AR')} (${paymentMethod}) registrado en estadísticas.`
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error confirming post-appointment data:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentOptions: { id: PaymentMethod; label: string; icon: any; desc: string }[] = [
    { id: 'cash', label: 'Efectivo', icon: Banknote, desc: 'Ingresa a Caja diaria automáticamente' },
    { id: 'transfer', label: 'Transferencia', icon: Building, desc: 'CBU / CVU / Alias bancario' },
    { id: 'mercadopago', label: 'Mercado Pago', icon: Smartphone, desc: 'Cobro online o dinero en cuenta' },
    { id: 'card_debit', label: 'Débito', icon: CreditCard, desc: 'Tarjeta de débito en posnet' },
    { id: 'card_credit', label: 'Crédito', icon: CreditCard, desc: 'Tarjeta de crédito' },
    { id: 'insurance', label: 'Obra Social / Cobertura', icon: ShieldCheck, desc: 'Bono o copago liquidable' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-neutral-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Finalizar Cita & Validar Cobro</h2>
              <p className="text-xs text-emerald-100 font-medium">
                {appointment.patient_name} • {appointment.service_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Status conversion badge banner if prospect */}
          {isProspect ? (
            <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <Award className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-amber-950">Promoción a Cliente Activo</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                    Era Futuro Cliente
                  </span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Este paciente consultó previamente y completó su primera cita. Al confirmar, su estado se actualizará automáticamente a <strong>Cliente Activo</strong>.
                </p>
                <label className="flex items-center gap-2 mt-2 font-semibold text-amber-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promoteToActive}
                    onChange={e => setPromoteToActive(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Asignar insignia y estado de Cliente Activo</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Cliente Activo recurrente:</strong> Ya cuenta con historial de citas asistidas en el consultorio.
                </span>
              </div>
            </div>
          )}

          {/* Appointment Recap Mini-Card */}
          <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200 text-xs space-y-1.5">
            <div className="flex justify-between items-center text-neutral-600">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-400" /> Fecha y horario:
              </span>
              <span className="font-semibold text-neutral-900 capitalize">{dateStr} a las {timeStr} hs</span>
            </div>
            <div className="flex justify-between items-center text-neutral-600">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-neutral-400" /> Arancel del servicio:
              </span>
              <span className="font-bold text-neutral-900 text-sm">
                ${(appointment.service_price || appointment.price || 0).toLocaleString('es-AR')} {practiceSettings.currency || 'ARS'}
              </span>
            </div>
          </div>

          {/* Payment Validation Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-900 flex items-center gap-1.5 uppercase tracking-wider">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Medio de Pago Utilizado
              </label>
              <label className="flex items-center gap-1.5 text-xs text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={e => setIsPaid(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <span className="font-medium">Abonó la consulta</span>
              </label>
            </div>

            {isPaid ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {paymentOptions.map(opt => {
                    const Icon = opt.icon;
                    const isSelected = paymentMethod === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPaymentMethod(opt.id)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500 text-emerald-950 shadow-xs'
                            : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-800'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight">{opt.label}</p>
                          <p className="text-[10px] text-neutral-500 leading-tight mt-0.5 truncate">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1">
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Monto cobrado para estadísticas y caja ({practiceSettings.currency || 'ARS'})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={amountPaid}
                      onChange={e => setAmountPaid(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 text-sm font-semibold border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>La consulta quedará marcada como realizada con pago pendiente de cobro.</span>
              </div>
            )}
          </div>

          {/* Additional Patient Data Section */}
          <div className="border-t border-neutral-100 pt-4 space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-600" />
              Datos Adicionales del Paciente (Opcional)
            </h4>
            <p className="text-[11px] text-neutral-500 -mt-1">
              Completa o actualiza la ficha del paciente para tu base de datos clínica.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-neutral-700 mb-1">DNI / Identificación</label>
                <input
                  type="text"
                  placeholder="Ej. 38.291.042"
                  value={dni}
                  onChange={e => setDni(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-neutral-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="paciente@correo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-neutral-700 mb-1">Obra Social / Cobertura</label>
                <input
                  type="text"
                  placeholder="OSDE, Swiss Medical..."
                  value={insurance}
                  onChange={e => setInsurance(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                Notas de la sesión / Observaciones del turno
              </label>
              <textarea
                rows={2}
                placeholder="Tratamiento realizado, pautas indicadas, próxima cita tentativa..."
                value={clinicalNotes}
                onChange={e => setClinicalNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-sky-500 resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Confirmar Cita y Registrar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
