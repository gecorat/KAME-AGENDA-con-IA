import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, User, DollarSign, FileText, Video, Phone, MessageSquare, Mail, CheckCheck, Bell, Check, Receipt, Search, Plus, UserPlus, CheckCircle2, ChevronDown, ShieldCheck, AlertCircle, Trash2 } from 'lucide-react';
import { Appointment, AppointmentStatus, PaymentStatus, PaymentRecord, Patient } from '../types';
import { useAgendaStore } from '../lib/store';
import { ReceiptModal } from './ReceiptModal';
import { NewPaymentModal } from './NewPaymentModal';
import { PhoneInputWithCountry } from './PhoneInputWithCountry';
import { ConfirmModal } from './ConfirmModal';
import { getClientTerm } from '../lib/terminology';
import { formatAppointmentConfirmationMessage } from '../lib/appointment-messages';
import {
  getArgentinaDateString,
  getArgentinaTimeString,
  parseArgentinaDate,
  createArgentinaIsoString,
  getTodayArgentinaDateStr
} from '../lib/timezone';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentToEdit?: Appointment | null;
  defaultDate?: string; // YYYY-MM-DD
  defaultTime?: string; // HH:mm
  defaultPatientId?: string;
  onOpenConsultation?: (patientId: string, appointmentId: string) => void;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  appointmentToEdit,
  defaultDate,
  defaultTime,
  defaultPatientId,
  onOpenConsultation
}) => {
  const {
    patients,
    services,
    payments,
    practiceSettings,
    voidPayment,
    addAppointment,
    updateAppointment,
    verifyAppointmentDeposit,
    addPatient,
    sendWhatsAppReminder,
    sendEmailReminder,
    confirmAppointmentByPatient,
    syncAppointmentConfirmationToChat,
    deleteAppointment
  } = useAgendaStore();

  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

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
  const [patientConfirmed, setPatientConfirmed] = useState<boolean>(true);
  // Solo viene tildado para turnos NUEVOS. Al editar uno existente, "Guardar
  // Cambios" guarda y nada mas: antes abria WhatsApp siempre.
  const [sendWhatsAppOnSave, setSendWhatsAppOnSave] = useState<boolean>(!appointmentToEdit);
  const [sentNotice, setSentNotice] = useState<string | null>(null);
  const [isChangingPatient, setIsChangingPatient] = useState(false);
  const [showDepositSection, setShowDepositSection] = useState(false);

  // Deposit verification states
  const [depositDeclared, setDepositDeclared] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositVerified, setDepositVerified] = useState<boolean>(false);
  const [depositMethod, setDepositMethod] = useState<string>('transfer');
  const [depositNotes, setDepositNotes] = useState<string>('');

  // Modals for payment
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isNewPayOpen, setIsNewPayOpen] = useState(false);
  const [activePayment, setActivePayment] = useState<PaymentRecord | null>(null);

  const existingPayment = appointmentToEdit
    ? payments.find(p => p.appointment_id === appointmentToEdit.id && p.status === 'completed')
    : null;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(event.target as Node)) {
        setIsPatientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (appointmentToEdit) {
      setSelectedPatientId(appointmentToEdit.patient_id);
      setSelectedServiceId(appointmentToEdit.service_id);
      
      const found = patients.find(p => p.id === appointmentToEdit.patient_id);
      if (found) {
        setPatientSearchQuery(`${found.first_name} ${found.last_name}`.trim());
      } else {
        setPatientSearchQuery(appointmentToEdit.patient_name || '');
      }

      const d = parseArgentinaDate(appointmentToEdit.start_datetime);
      setDate(getArgentinaDateString(d));
      setTime(getArgentinaTimeString(d));
      
      setStatus(appointmentToEdit.status);
      setPaymentStatus(appointmentToEdit.payment_status);
      setNotes(appointmentToEdit.notes || '');
      setIsTelemedicine(appointmentToEdit.origin === 'telemedicine');
      setPatientConfirmed(appointmentToEdit.patient_confirmed ?? (appointmentToEdit.status === 'confirmed' || appointmentToEdit.status === 'completed'));
      setNewPatientMode(false);

      setDepositDeclared(!!appointmentToEdit.deposit_declared);
      setDepositAmount(appointmentToEdit.deposit_amount || 0);
      setDepositVerified(!!appointmentToEdit.deposit_verified);
      setDepositMethod(appointmentToEdit.deposit_method || 'transfer');
      setDepositNotes(appointmentToEdit.deposit_notes || '');
      setShowDepositSection(Boolean(
        appointmentToEdit.deposit_declared || 
        (appointmentToEdit.deposit_amount && appointmentToEdit.deposit_amount > 0) || 
        appointmentToEdit.deposit_verified
      ));
      setIsChangingPatient(false);
    } else {
      const targetPatient = defaultPatientId 
        ? patients.find(p => p.id === defaultPatientId) 
        : (patients[0] || null);

      if (targetPatient) {
        setSelectedPatientId(targetPatient.id);
        setPatientSearchQuery(`${targetPatient.first_name} ${targetPatient.last_name}`.trim());
        setNewPatientMode(false);
      } else if (patients.length > 0) {
        setSelectedPatientId(patients[0]?.id || '');
        setPatientSearchQuery(`${patients[0]?.first_name} ${patients[0]?.last_name}`.trim());
        setNewPatientMode(false);
      } else {
        setSelectedPatientId('');
        setPatientSearchQuery('');
        setNewPatientMode(true);
      }
      setSelectedServiceId(services[0]?.id || '');
      
      const today = defaultDate || getTodayArgentinaDateStr();
      setDate(today);
      setTime(defaultTime || '10:00');
      
      setStatus('confirmed');
      setPaymentStatus('pending');
      setNotes('');
      setIsTelemedicine(false);
      setPatientConfirmed(false);
      setNewPatientName('');
      setNewPatientPhone('');
      setNewPatientDni('');

      setDepositDeclared(false);
      setDepositAmount(0);
      setDepositVerified(false);
      setDepositMethod('transfer');
      setDepositNotes('');
    }
  }, [appointmentToEdit, isOpen, defaultDate, defaultTime, defaultPatientId, patients, services]);

  if (!isOpen) return null;

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const filteredPatients = patients.filter(p => {
    const q = patientSearchQuery.trim().toLowerCase();
    if (!q) return true;
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const phone = (p.phone || '').toLowerCase();
    const dni = (p.dni || '').toLowerCase();
    return fullName.includes(q) || phone.includes(q) || dni.includes(q);
  });

  const handleSelectExistingPatient = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setPatientSearchQuery(`${patient.first_name} ${patient.last_name}`.trim());
    setNewPatientMode(false);
    setIsPatientDropdownOpen(false);
  };

  const handleStartNewPatient = (namePrefill?: string) => {
    setSelectedPatientId('');
    setNewPatientMode(true);
    if (namePrefill) {
      setNewPatientName(namePrefill);
    } else if (patientSearchQuery && !selectedPatient) {
      setNewPatientName(patientSearchQuery);
    }
    setIsPatientDropdownOpen(false);
  };

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
      } else if (patientSearchQuery.trim()) {
        targetPatientName = patientSearchQuery.trim();
        targetPatientPhone = appointmentToEdit?.patient_phone || "";
      } else {
        targetPatientName = "Paciente";
        targetPatientPhone = appointmentToEdit?.patient_phone || "";
      }
    }

    const service = services.find(s => s.id === selectedServiceId) || services[0];
    const duration = service?.duration_minutes || 30;

    const startIso = createArgentinaIsoString(date, time);
    const startObj = new Date(startIso);
    const endObj = new Date(startObj.getTime() + duration * 60000);

    let savedApt: Appointment;

    if (appointmentToEdit) {
      savedApt = {
        ...appointmentToEdit,
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
        patient_confirmed: patientConfirmed || status === 'confirmed' || status === 'completed' || sendWhatsAppOnSave,
        origin: isTelemedicine ? 'telemedicine' : (appointmentToEdit.origin || 'manual'),
        meet_url: isTelemedicine ? 'https://meet.google.com/agd-pro-meet' : undefined,
        deposit_declared: depositDeclared,
        deposit_amount: depositAmount > 0 ? Number(depositAmount) : undefined,
        deposit_verified: depositVerified,
        deposit_method: depositMethod as any,
        deposit_notes: depositNotes
      };
      updateAppointment(appointmentToEdit.id, savedApt);
    } else {
      savedApt = addAppointment({
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
        patient_confirmed: patientConfirmed || status === 'confirmed' || status === 'completed' || sendWhatsAppOnSave,
        origin: isTelemedicine ? 'telemedicine' : 'manual',
        meet_url: isTelemedicine ? 'https://meet.google.com/agd-pro-meet' : undefined,
        deposit_declared: depositDeclared,
        deposit_amount: depositAmount > 0 ? Number(depositAmount) : undefined,
        deposit_verified: depositVerified,
        deposit_method: depositMethod as any,
        deposit_notes: depositNotes
      });
    }

    // Si está tildado enviar confirmación por WhatsApp y el paciente tiene teléfono
    if (sendWhatsAppOnSave && targetPatientPhone) {
      const confirmationText = formatAppointmentConfirmationMessage(
        savedApt,
        practiceSettings,
        { forChat: false, services }
      );
      const chatText = formatAppointmentConfirmationMessage(
        savedApt,
        practiceSettings,
        { forChat: true, services }
      );
      syncAppointmentConfirmationToChat(savedApt, chatText);

      const cleanPhone = targetPatientPhone.replace(/\D/g, '');
      if (cleanPhone) {
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(confirmationText)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }
    }

    onClose();
  };

  const handleSendWhatsAppConfirmationNow = () => {
    let targetPatientId = selectedPatientId || appointmentToEdit?.patient_id || 'pat-manual';
    let targetPatientName = '';
    let targetPatientPhone = '';

    if (newPatientMode) {
      targetPatientName = newPatientName.trim();
      targetPatientPhone = newPatientPhone.trim();
    } else {
      const patient = patients.find(p => p.id === selectedPatientId);
      targetPatientId = patient ? patient.id : targetPatientId;
      targetPatientName = patient ? `${patient.first_name} ${patient.last_name}` : patientSearchQuery.trim();
      targetPatientPhone = patient?.phone || '';
    }

    if (!targetPatientPhone) {
      setSentNotice('Ingresá el teléfono del paciente para enviar');
      setTimeout(() => setSentNotice(null), 3000);
      return;
    }

    const service = services.find(s => s.id === selectedServiceId) || services[0];
    const duration = service?.duration_minutes || 30;
    const startIso = createArgentinaIsoString(date, time);
    const startObj = new Date(startIso);
    const endObj = new Date(startObj.getTime() + duration * 60000);

    const tempApt: Appointment = {
      id: appointmentToEdit ? appointmentToEdit.id : `apt-temp-${Date.now()}`,
      patient_id: targetPatientId || 'pat-temp',
      patient_name: targetPatientName || 'Paciente',
      patient_phone: targetPatientPhone,
      service_id: service.id,
      service_name: service.name,
      service_price: service.price,
      start_datetime: startObj.toISOString(),
      end_datetime: endObj.toISOString(),
      status: 'confirmed',
      payment_status: paymentStatus,
      origin: isTelemedicine ? 'telemedicine' : 'manual',
      patient_confirmed: true
    };

    const directMessage = formatAppointmentConfirmationMessage(
      tempApt,
      practiceSettings,
      { forChat: false, services }
    );
    const chatMessage = formatAppointmentConfirmationMessage(
      tempApt,
      practiceSettings,
      { forChat: true, services }
    );

    syncAppointmentConfirmationToChat(tempApt, chatMessage);
    setPatientConfirmed(true);

    const cleanPhone = targetPatientPhone.replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(directMessage)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    setSentNotice('Confirmación enviada y registrada en el chat');
    setTimeout(() => setSentNotice(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Simplified Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-200 bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 leading-tight">
                {appointmentToEdit ? 'Editar Turno' : 'Nuevo Turno'}
              </h2>
              {appointmentToEdit && (
                <p className="text-[11px] text-neutral-500 font-medium">
                  {appointmentToEdit.patient_name} • {appointmentToEdit.service_name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {appointmentToEdit && onOpenConsultation && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenConsultation(appointmentToEdit.patient_id, appointmentToEdit.id);
                }}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Abrir historia clínica, evoluciones y recetas"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ficha Médica</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-3.5 max-h-[82vh] overflow-y-auto">
          {/* Patient display / selection */}
          {appointmentToEdit && !isChangingPatient ? (
            <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {(selectedPatient?.first_name || appointmentToEdit.patient_name)[0] || 'P'}
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <span>{selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : appointmentToEdit.patient_name}</span>
                    {patientConfirmed && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-100/90 px-1.5 py-0.2 rounded font-medium">
                        Confirmado
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                    <span>{selectedPatient?.phone || appointmentToEdit.patient_phone || 'Sin WhatsApp'}</span>
                    {selectedPatient?.dni && <span>• DNI: {selectedPatient.dni}</span>}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChangingPatient(true)}
                className="text-xs font-semibold text-sky-600 hover:text-sky-800 hover:underline px-2 py-1 cursor-pointer"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-neutral-500" />
                  Paciente
                </label>
                <div className="flex items-center gap-2">
                  {appointmentToEdit && isChangingPatient && (
                    <button
                      type="button"
                      onClick={() => setIsChangingPatient(false)}
                      className="text-xs text-neutral-500 hover:underline cursor-pointer"
                    >
                      Cancelar cambio
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (newPatientMode) {
                        setNewPatientMode(false);
                        if (patients.length > 0) {
                          setSelectedPatientId(patients[0].id);
                          setPatientSearchQuery(`${patients[0].first_name} ${patients[0].last_name}`.trim());
                        }
                      } else {
                        handleStartNewPatient(patientSearchQuery);
                      }
                    }}
                    className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    {newPatientMode ? '← Buscar existente' : '+ Nuevo paciente'}
                  </button>
                </div>
              </div>

              {newPatientMode ? (
                <div className="space-y-3 p-3.5 bg-sky-50/50 rounded-2xl border border-sky-100 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs text-sky-900 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-sky-600" />
                      Registrar nuevo paciente
                    </span>
                    {patients.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setNewPatientMode(false)}
                        className="text-[11px] text-sky-600 hover:underline"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Nombre y Apellido *"
                      value={newPatientName}
                      onChange={e => setNewPatientName(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-neutral-600 block">
                      Teléfono WhatsApp (código de país y número local) *
                    </label>
                    <PhoneInputWithCountry
                      value={newPatientPhone}
                      onChange={(phone) => setNewPatientPhone(phone)}
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="DNI o Documento (opcional)"
                      value={newPatientDni}
                      onChange={e => setNewPatientDni(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 h-[38px]"
                    />
                  </div>
                </div>
              ) : (
                <div className="relative" ref={patientDropdownRef}>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={patientSearchQuery}
                      onChange={(e) => {
                        setPatientSearchQuery(e.target.value);
                        setIsPatientDropdownOpen(true);
                        if (selectedPatientId && `${selectedPatient?.first_name} ${selectedPatient?.last_name}`.trim() !== e.target.value) {
                          setSelectedPatientId('');
                        }
                      }}
                      onFocus={() => setIsPatientDropdownOpen(true)}
                      placeholder="Buscar paciente por nombre, WhatsApp o DNI..."
                      className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setIsPatientDropdownOpen(!isPatientDropdownOpen)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-neutral-400 hover:text-neutral-600"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isPatientDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {isPatientDropdownOpen && (
                    <div className="absolute z-20 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-neutral-200 shadow-lg max-h-52 overflow-y-auto divide-y divide-neutral-100 animate-in fade-in duration-100">
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map(p => {
                          const isChosen = p.id === selectedPatientId;
                          return (
                            <div
                              key={p.id}
                              onClick={() => handleSelectExistingPatient(p)}
                              className={`p-2.5 hover:bg-neutral-50 cursor-pointer flex items-center justify-between transition ${isChosen ? 'bg-sky-50/70' : ''}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center text-xs font-bold">
                                  {p.first_name[0]}{p.last_name[0] || ''}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-neutral-900">
                                    {p.first_name} {p.last_name}
                                  </div>
                                  <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                                    <span>{p.phone}</span>
                                    {p.dni && <span>• DNI: {p.dni}</span>}
                                  </div>
                                </div>
                              </div>
                              {isChosen && <Check className="w-4 h-4 text-sky-600" />}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-3 text-center text-xs text-neutral-500">
                          No se encontró "{patientSearchQuery}".
                        </div>
                      )}
                      <div
                        onClick={() => handleStartNewPatient(patientSearchQuery)}
                        className="p-2.5 bg-sky-50/40 hover:bg-sky-50 text-sky-700 cursor-pointer flex items-center gap-2 text-xs font-semibold transition"
                      >
                        <Plus className="w-4 h-4 text-sky-600" />
                        <span>+ Registrar nuevo paciente</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Service selection */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-neutral-500" />
              Servicio o Tratamiento
            </label>
            <select
              value={selectedServiceId}
              onChange={e => setSelectedServiceId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — ${s.price.toLocaleString('es-AR')} ({s.duration_minutes} min)
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                Hora
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
          </div>

          {/* Status and Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Estado del Turno
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as AppointmentStatus)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="confirmed">Confirmado</option>
                <option value="pending">Pendiente de confirmación</option>
                <option value="completed">Atendido / Completado</option>
                <option value="cancelled">Cancelado</option>
                <option value="no_show">Ausente (No se presentó)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Estado del Pago
              </label>
              <select
                value={paymentStatus}
                onChange={e => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="pending">Pendiente en consulta</option>
                <option value="paid">Abonado</option>
                <option value="partial">Seña abonada</option>
              </select>
            </div>
          </div>

          {/* Compact Billing Row (only in Edit mode) */}
          {appointmentToEdit && (
            <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs">
              {existingPayment ? (
                <div className="flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-900 font-medium truncate">
                    Recibo #{existingPayment.receipt_number} ({existingPayment.method.toUpperCase()}) — ${existingPayment.amount.toLocaleString('es-AR')}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-neutral-600">
                  <DollarSign className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>Cobro pendiente en caja (${appointmentToEdit.service_price?.toLocaleString('es-AR')})</span>
                </div>
              )}

              {existingPayment ? (
                <button
                  type="button"
                  onClick={() => {
                    setActivePayment(existingPayment);
                    setIsReceiptOpen(true);
                  }}
                  className="font-bold text-emerald-700 hover:underline px-1.5 py-0.5 cursor-pointer shrink-0"
                >
                  Ver Recibo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsNewPayOpen(true)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <DollarSign className="w-3 h-3" />
                  <span>Cobrar</span>
                </button>
              )}
            </div>
          )}

          {/* Seña / Anticipo (Compact or Expandable) */}
          {showDepositSection || depositDeclared || depositAmount > 0 || depositVerified ? (
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-neutral-900">Seña / Anticipo</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const nextStatus = !depositVerified;
                      setDepositVerified(nextStatus);
                      if (nextStatus) {
                        setPaymentStatus('partial');
                        if (appointmentToEdit) verifyAppointmentDeposit(appointmentToEdit.id, true);
                      } else {
                        if (paymentStatus === 'partial') setPaymentStatus('pending');
                        if (appointmentToEdit) verifyAppointmentDeposit(appointmentToEdit.id, false);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                      depositVerified
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{depositVerified ? 'Seña Verificada' : 'Marcar Recibida'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDepositSection(false);
                      setDepositAmount(0);
                      setDepositDeclared(false);
                      setDepositVerified(false);
                    }}
                    className="text-neutral-400 hover:text-neutral-600 p-0.5"
                    title="Quitar seña"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-600 block mb-0.5">
                    Monto de Seña ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={depositAmount}
                    onChange={e => setDepositAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-xs text-neutral-900 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-neutral-600 block mb-0.5">
                    Medio de Cobro
                  </label>
                  <select
                    value={depositMethod}
                    onChange={e => setDepositMethod(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-neutral-900 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="transfer">Transferencia Bancaria</option>
                    <option value="mercado_pago">Mercado Pago</option>
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowDepositSection(true);
                const s = services.find(srv => srv.id === selectedServiceId);
                setDepositAmount(s?.deposit_required ? (s.deposit_amount || 5000) : 5000);
              }}
              className="text-xs text-neutral-500 hover:text-amber-700 font-medium flex items-center gap-1.5 transition py-1 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>+ Registrar seña o anticipo de reserva</span>
            </button>
          )}

          {/* Opciones Adicionales (Telemedicina & WhatsApp) */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-medium text-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTelemedicine}
                  onChange={e => setIsTelemedicine(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                />
                <span className="flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-sky-600" />
                  Videoconsulta (Google Meet automático)
                </span>
              </label>

              <label className="flex items-center gap-1.5 font-medium text-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={patientConfirmed}
                  onChange={e => setPatientConfirmed(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span>Confirmado</span>
              </label>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-neutral-200/60">
              <label className="flex items-center gap-2 text-[11px] text-neutral-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendWhatsAppOnSave}
                  onChange={e => setSendWhatsAppOnSave(e.target.checked)}
                  className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span>Avisar al paciente por WhatsApp al guardar</span>
              </label>

              <button
                type="button"
                onClick={handleSendWhatsAppConfirmationNow}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer"
                title="Abrir WhatsApp para enviar confirmación"
              >
                <MessageSquare className="w-3 h-3" />
                <span>Enviar WhatsApp ahora</span>
              </button>
            </div>

            {sentNotice && (
              <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> {sentNotice}
              </p>
            )}
          </div>

          {/* Clinical notes */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-neutral-500" />
              Notas o recordatorios
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej. Traer estudios previos, indicación..."
              className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
            {appointmentToEdit ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                title="Eliminar este turno"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Turno</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition cursor-pointer"
              >
                {appointmentToEdit ? 'Guardar Cambios' : 'Agendar Turno'}
              </button>
            </div>
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

      {/* Confirmation Dialog for Appointment Deletion */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          if (appointmentToEdit) {
            deleteAppointment(appointmentToEdit.id);
            setShowDeleteConfirm(false);
            onClose();
          }
        }}
        title="¿Eliminar Turno?"
        message={`¿Está seguro de que desea eliminar el turno de ${appointmentToEdit?.patient_name} agendado para el ${appointmentToEdit?.date} a las ${appointmentToEdit?.time}? Esta acción cancelará y eliminará el turno permanentemente.`}
        confirmText="Sí, Eliminar Turno"
        variant="danger"
      />
    </div>
  );
};
