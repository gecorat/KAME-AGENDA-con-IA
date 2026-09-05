import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, DollarSign, FileText, Video, Phone, MessageSquare, Mail, CheckCheck, Bell, Check, Receipt } from 'lucide-react';
import { Appointment, AppointmentStatus, PaymentStatus, PaymentRecord } from '../types';
import { useAgendaStore } from '../lib/store';
import { ReceiptModal } from './ReceiptModal';
import { NewPaymentModal } from './NewPaymentModal';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentToEdit?: Appointment | null;
  defaultDate?: string; // YYYY-MM-DD
  defaultTime?: string; // HH:mm
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  appointmentToEdit,
  defaultDate,
  defaultTime
}) => {
  const {
    patients,
    services,
    payments,
    voidPayment,
    addAppointment,
    updateAppointment,
    addPatient,
    sendWhatsAppReminder,
    sendEmailReminder,
    confirmAppointmentByPatient
  } = useAgendaStore();

  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [newPatientMode, setNewPatientMode] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientDni, setNewPatientDni] = useState('');

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('10:00');
  const [status, setStatus] = useState<AppointmentStatus>('confirmed');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [notes, setNotes] = useState<string>('');
  const [isTelemedicine, setIsTelemedicine] = useState<boolean>(false);
  const [patientConfirmed, setPatientConfirmed] = useState<boolean>(false);
  const [sentNotice, setSentNotice] = useState<string | null>(null);

  // Modals for payment
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isNewPayOpen, setIsNewPayOpen] = useState(false);
  const [activePayment, setActivePayment] = useState<PaymentRecord | null>(null);

  const existingPayment = appointmentToEdit
    ? payments.find(p => p.appointment_id === appointmentToEdit.id && p.status === 'completed')
    : null;

  useEffect(() => {
    if (appointmentToEdit) {
      setSelectedPatientId(appointmentToEdit.patient_id);
      setSelectedServiceId(appointmentToEdit.service_id);
      
      const d = new Date(appointmentToEdit.start_datetime);
      setDate(d.toISOString().split('T')[0]);
      setTime(d.toTimeString().slice(0, 5));
      
      setStatus(appointmentToEdit.status);
      setPaymentStatus(appointmentToEdit.payment_status);
      setNotes(appointmentToEdit.notes || '');
      setIsTelemedicine(appointmentToEdit.origin === 'telemedicine');
      setPatientConfirmed(!!appointmentToEdit.patient_confirmed);
      setNewPatientMode(false);
    } else {
      setSelectedPatientId(patients[0]?.id || '');
      setSelectedServiceId(services[0]?.id || '');
      
      const today = defaultDate || new Date().toISOString().split('T')[0];
      setDate(today);
      setTime(defaultTime || '10:00');
      
      setStatus('confirmed');
      setPaymentStatus('pending');
      setNotes('');
      setIsTelemedicine(false);
      setPatientConfirmed(false);
      setNewPatientMode(false);
    }
  }, [appointmentToEdit, isOpen, defaultDate, defaultTime, patients, services]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let targetPatientId = selectedPatientId;
    let targetPatientName = '';
    let targetPatientPhone = '';

    if (newPatientMode) {
      if (!newPatientName.trim() || !newPatientPhone.trim()) {
        alert('Por favor complete el nombre y teléfono del nuevo paciente.');
        return;
      }
      const parts = newPatientName.trim().split(' ');
      const firstName = parts[0] || 'Paciente';
      const lastName = parts.slice(1).join(' ') || '';
      
      const createdPatient = addPatient({
        first_name: firstName,
        last_name: lastName,
        phone: newPatientPhone.trim(),
        dni: newPatientDni.trim() || undefined
      });
      targetPatientId = createdPatient.id;
      targetPatientName = `${firstName} ${lastName}`.trim();
      targetPatientPhone = createdPatient.phone;
    } else {
      const found = patients.find(p => p.id === targetPatientId);
      if (found) {
        targetPatientName = `${found.first_name} ${found.last_name}`.trim();
        targetPatientPhone = found.phone;
      } else {
        targetPatientName = "Paciente";
        targetPatientPhone = "+54 9 11 ...";
      }
    }

    const service = services.find(s => s.id === selectedServiceId) || services[0];
    const duration = service?.duration_minutes || 30;

    const [hours, minutes] = time.split(':').map(Number);
    const startObj = new Date(date);
    startObj.setHours(hours, minutes, 0, 0);

    const endObj = new Date(startObj.getTime() + duration * 60000);

    if (appointmentToEdit) {
      updateAppointment(appointmentToEdit.id, {
        patient_id: targetPatientId,
        patient_name: targetPatientName,
        patient_phone: targetPatientPhone,
        service_id: service.id,
        service_name: service.name,
        service_price: service.price,
        start_datetime: startObj.toISOString(),
        end_datetime: endObj.toISOString(),
        status,
        payment_status: paymentStatus,
        notes,
        patient_confirmed: patientConfirmed,
        origin: isTelemedicine ? 'telemedicine' : (appointmentToEdit.origin || 'manual'),
        meet_url: isTelemedicine ? 'https://meet.google.com/agd-pro-meet' : undefined
      });
    } else {
      addAppointment({
        patient_id: targetPatientId,
        patient_name: targetPatientName,
        patient_phone: targetPatientPhone,
        service_id: service.id,
        service_name: service.name,
        service_price: service.price,
        start_datetime: startObj.toISOString(),
        end_datetime: endObj.toISOString(),
        status,
        payment_status: paymentStatus,
        notes,
        patient_confirmed: patientConfirmed,
        origin: isTelemedicine ? 'telemedicine' : 'manual',
        meet_url: isTelemedicine ? 'https://meet.google.com/agd-pro-meet' : undefined
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-neutral-900">
              {appointmentToEdit ? 'Editar Turno' : 'Nuevo Turno'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Patient selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-neutral-500" />
                Paciente
              </label>
              <button
                type="button"
                onClick={() => setNewPatientMode(!newPatientMode)}
                className="text-xs text-sky-600 hover:text-sky-700 font-medium"
              >
                {newPatientMode ? '← Seleccionar existente' : '+ Nuevo paciente'}
              </button>
            </div>

            {newPatientMode ? (
              <div className="space-y-2 p-3 bg-sky-50/50 rounded-xl border border-sky-100">
                <input
                  type="text"
                  placeholder="Nombre y Apellido *"
                  value={newPatientName}
                  onChange={e => setNewPatientName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    placeholder="Teléfono (WhatsApp) *"
                    value={newPatientPhone}
                    onChange={e => setNewPatientPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="DNI (opcional)"
                    value={newPatientDni}
                    onChange={e => setNewPatientDni(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            ) : (
              <select
                value={selectedPatientId}
                onChange={e => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} ({p.phone}) {p.dni ? `- DNI ${p.dni}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Service selection */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-neutral-500" />
              Servicio o Tratamiento
            </label>
            <select
              value={selectedServiceId}
              onChange={e => setSelectedServiceId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} - ${s.price.toLocaleString()} ({s.duration_minutes} min)
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                Hora de Inicio
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
          </div>

          {/* Status and Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Estado del Turno
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as AppointmentStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="confirmed">Confirmado</option>
                <option value="pending">Pendiente de confirmación</option>
                <option value="completed">Atendido / Completado</option>
                <option value="cancelled">Cancelado</option>
                <option value="no_show">Ausente (No se presentó)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Estado del Pago
              </label>
              <select
                value={paymentStatus}
                onChange={e => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="pending">Pendiente en consulta</option>
                <option value="paid">Abonado</option>
                <option value="partial">Seña abonada</option>
              </select>
            </div>
          </div>

          {/* Quick Billing Action Box if editing */}
          {appointmentToEdit && (
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                {existingPayment ? (
                  <div>
                    <span className="font-semibold text-neutral-900 block">
                      Recibo {existingPayment.receipt_number} emitido
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      ${existingPayment.amount.toLocaleString('es-AR')} • {existingPayment.method.toUpperCase()}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="font-semibold text-neutral-800 block">
                      Turno sin cobro registrado en caja
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Arancel: ${appointmentToEdit.service_price?.toLocaleString('es-AR')}
                    </span>
                  </div>
                )}
              </div>

              {existingPayment ? (
                <button
                  type="button"
                  onClick={() => {
                    setActivePayment(existingPayment);
                    setIsReceiptOpen(true);
                  }}
                  className="px-3 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-lg text-xs font-semibold text-neutral-800 transition-colors shadow-2xs"
                >
                  Ver Recibo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsNewPayOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Cobrar Ahora
                </button>
              )}
            </div>
          )}

          {/* Telemedicine toggle */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-sky-600" />
              <div>
                <p className="text-xs font-medium text-neutral-900">Videoconsulta / Telemedicina</p>
                <p className="text-[11px] text-neutral-500">Genera enlace Google Meet automático</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isTelemedicine}
              onChange={e => setIsTelemedicine(e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
            />
          </div>

          {/* Recordatorios Automatizados & Confirmación */}
          <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-neutral-900">Recordatorios & Confirmación</span>
              </div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={patientConfirmed}
                  onChange={e => setPatientConfirmed(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span>Confirmado por paciente</span>
              </label>
            </div>

            {appointmentToEdit && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const res = sendWhatsAppReminder(appointmentToEdit.id, 'manual');
                    if (res.success && res.waUrl) {
                      window.open(res.waUrl, '_blank', 'noopener,noreferrer');
                      setSentNotice('WhatsApp enviado');
                      setTimeout(() => setSentNotice(null), 2500);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Enviar WhatsApp Ahora
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sendEmailReminder(appointmentToEdit.id, 'manual');
                    setSentNotice('Correo enviado');
                    setTimeout(() => setSentNotice(null), 2500);
                  }}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Enviar Correo Ahora
                </button>

                {sentNotice && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 ml-auto">
                    <Check className="w-3.5 h-3.5" /> {sentNotice}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-neutral-500" />
              Notas clínicas o recordatorios
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej. Traer panorámica previa, control de brackets..."
              className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors"
            >
              {appointmentToEdit ? 'Guardar Cambios' : 'Agendar Turno'}
            </button>
          </div>
        </form>
      </div>

      {/* Sub-modals for Receipt and Payment */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        payment={activePayment}
        onVoid={voidPayment}
      />

      <NewPaymentModal
        isOpen={isNewPayOpen}
        onClose={() => setIsNewPayOpen(false)}
        preselectedAppointment={appointmentToEdit}
        onPaymentSuccess={payment => {
          setActivePayment(payment);
          setPaymentStatus('paid');
          setIsReceiptOpen(true);
        }}
      />
    </div>
  );
};
