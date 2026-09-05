import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Star,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Video,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAgendaStore } from '../lib/store';
import { Service } from '../types';

interface PublicBookingViewProps {
  onBackToDashboard?: () => void;
}

export const PublicBookingView: React.FC<PublicBookingViewProps> = ({ onBackToDashboard }) => {
  const { practiceSettings, services, availability, appointments, addAppointment } = useAgendaStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(
    services.find(s => s.active) || null
  );
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('+54 9 11 ');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientDni, setPatientDni] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [confirmedBookingCode, setConfirmedBookingCode] = useState('');

  // Active services
  const activeServices = services.filter(s => s.active);

  // Compute available slots for the selected date
  const computeAvailableSlots = (dateStr: string, serviceDuration: number): string[] => {
    const d = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon ...
    const dayConfig = availability.find(a => a.day_of_week === dayOfWeek);

    if (!dayConfig || !dayConfig.enabled) {
      return [];
    }

    const [startH, startM] = dayConfig.start_time.split(':').map(Number);
    const [endH, endM] = dayConfig.end_time.split(':').map(Number);

    const slots: string[] = [];
    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Break handling
    let breakStartMinutes = -1;
    let breakEndMinutes = -1;
    if (dayConfig.break_start && dayConfig.break_end) {
      const [bsh, bsm] = dayConfig.break_start.split(':').map(Number);
      const [beh, bem] = dayConfig.break_end.split(':').map(Number);
      breakStartMinutes = bsh * 60 + bsm;
      breakEndMinutes = beh * 60 + bem;
    }

    // Existing appointments on this date
    const dateAppointments = appointments.filter(a =>
      a.start_datetime.startsWith(dateStr) && a.status !== 'cancelled'
    );

    while (currentMinutes + serviceDuration <= endMinutes) {
      // Check break overlap
      if (
        breakStartMinutes !== -1 &&
        currentMinutes < breakEndMinutes &&
        currentMinutes + serviceDuration > breakStartMinutes
      ) {
        currentMinutes = breakEndMinutes;
        continue;
      }

      const slotHour = Math.floor(currentMinutes / 60);
      const slotMin = currentMinutes % 60;
      const slotStr = `${slotHour.toString().padStart(2, '0')}:${slotMin.toString().padStart(2, '0')}`;

      // Check overlap with existing appointments
      const slotStart = new Date(`${dateStr}T${slotStr}:00`).getTime();
      const slotEnd = slotStart + serviceDuration * 60000;

      const hasConflict = dateAppointments.some(apt => {
        const aptStart = new Date(apt.start_datetime).getTime();
        const aptEnd = new Date(apt.end_datetime).getTime();
        return slotStart < aptEnd && slotEnd > aptStart;
      });

      if (!hasConflict) {
        slots.push(slotStr);
      }

      // Step by 30 mins or duration
      currentMinutes += 30;
    }

    return slots;
  };

  const availableSlots = selectedService
    ? computeAvailableSlots(selectedDate, selectedService.duration_minutes)
    : [];

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedSlot || !patientName.trim() || !patientPhone.trim()) {
      alert('Por favor completa todos los datos requeridos.');
      return;
    }

    const startIso = `${selectedDate}T${selectedSlot}:00`;
    const startObj = new Date(startIso);
    const endObj = new Date(startObj.getTime() + selectedService.duration_minutes * 60000);

    const bookingCode = `KAME-${Math.floor(100000 + Math.random() * 900000)}`;

    addAppointment({
      patient_id: `pat-web-${Date.now()}`,
      patient_name: patientName.trim(),
      patient_phone: patientPhone.trim(),
      patient_email: patientEmail.trim() || undefined,
      service_id: selectedService.id,
      service_name: selectedService.name,
      service_price: selectedService.price,
      start_datetime: startObj.toISOString(),
      end_datetime: endObj.toISOString(),
      status: practiceSettings.auto_confirm_bookings ? 'confirmed' : 'pending',
      payment_status: 'pending',
      notes: `Reserva online #${bookingCode}. ${patientNotes.trim() ? `Nota: ${patientNotes.trim()}` : ''}`,
      origin: selectedService.category === 'Online' ? 'telemedicine' : 'public_booking'
    });

    setConfirmedBookingCode(bookingCode);
    setStep(5);

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Bar / Mode Notice */}
        {onBackToDashboard && (
          <div className="flex items-center justify-between">
            <button
              onClick={onBackToDashboard}
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 px-3 py-1.5 rounded-xl shadow-2xs transition-colors inline-flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Volver al Panel de Administración
            </button>
            <span className="text-xs bg-sky-100 text-sky-800 font-medium px-2.5 py-1 rounded-full border border-sky-200">
              Vista previa del enlace público: agendapro.ai/u/{practiceSettings.handle}
            </span>
          </div>
        )}

        {/* Practice Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-sky-600 text-white font-bold text-xl flex items-center justify-center shadow-xs">
                {practiceSettings.professional_name.slice(3, 5).toUpperCase() || 'DC'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-neutral-900">
                    {practiceSettings.practice_name}
                  </h1>
                  <ShieldCheck className="w-5 h-5 text-sky-600" />
                </div>
                <p className="text-sm font-medium text-neutral-600 mt-0.5">
                  {practiceSettings.professional_name} • {practiceSettings.specialty}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 mt-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" /> {practiceSettings.address}, {practiceSettings.city}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> 4.9 (128 valoraciones)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Steps Container */}
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
          {/* Step Progress Tracker */}
          {step < 5 && (
            <div className="border-b border-neutral-200 bg-neutral-50/50 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 max-w-md mx-auto">
                <span className={step >= 1 ? 'text-sky-600 font-bold' : ''}>1. Servicio</span>
                <span className="text-neutral-300">→</span>
                <span className={step >= 2 ? 'text-sky-600 font-bold' : ''}>2. Fecha & Hora</span>
                <span className="text-neutral-300">→</span>
                <span className={step >= 4 ? 'text-sky-600 font-bold' : ''}>3. Datos Paciente</span>
              </div>
            </div>
          )}

          <div className="p-6 sm:p-8">
            {/* Step 1: Select Service */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="text-center sm:text-left mb-6">
                  <h2 className="text-lg font-bold text-neutral-900">Selecciona el tratamiento</h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    Elige el servicio que deseas realizarte para ver la disponibilidad.
                  </p>
                </div>

                <div className="grid gap-3">
                  {activeServices.map(srv => {
                    const isSelected = selectedService?.id === srv.id;

                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedService(srv)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${isSelected ? 'border-sky-600 bg-sky-50/40 ring-2 ring-sky-500/20' : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-neutral-900">{srv.name}</span>
                            {srv.category === 'Online' && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium border border-indigo-200 flex items-center gap-1">
                                <Video className="w-3 h-3" /> Online
                              </span>
                            )}
                          </div>
                          {srv.description && (
                            <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                              {srv.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-neutral-600 mt-2 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-neutral-400" /> {srv.duration_minutes} min
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-bold text-neutral-900">
                            ${srv.price.toLocaleString()}
                          </span>
                          <span className="block text-[11px] text-neutral-400">ARS</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!selectedService}
                    className="px-6 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
                  >
                    Continuar al calendario <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 & 3: Select Date & Time */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900">Fecha y horario</h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Para: <span className="font-semibold text-neutral-900">{selectedService?.name}</span> ({selectedService?.duration_minutes} min)
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs text-sky-600 hover:underline font-medium"
                  >
                    Cambiar servicio
                  </button>
                </div>

                {/* Date Picker */}
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-2">
                    Selecciona el día
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => {
                      setSelectedDate(e.target.value);
                      setSelectedSlot('');
                    }}
                    className="w-full sm:w-64 px-4 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium text-neutral-800"
                  />
                </div>

                {/* Time Slots */}
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-2">
                    Horarios disponibles ({availableSlots.length})
                  </label>

                  {availableSlots.length === 0 ? (
                    <div className="p-6 text-center bg-neutral-50 rounded-2xl border border-neutral-200 text-neutral-500 text-xs">
                      No hay horarios disponibles para el día seleccionado. Por favor elige otra fecha.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                      {availableSlots.map(slot => {
                        const isSelected = selectedSlot === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold font-mono transition-all ${isSelected ? 'bg-sky-600 text-white border-sky-600 shadow-xs' : 'bg-neutral-50 border-neutral-200 text-neutral-800 hover:bg-sky-50 hover:border-sky-300'}`}
                          >
                            {slot} hs
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-800"
                  >
                    ← Volver
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    disabled={!selectedSlot}
                    className="px-6 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
                  >
                    Ingresar tus datos <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Patient Info Form */}
            {step === 4 && (
              <form onSubmit={handleConfirmBooking} className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">Tus datos para confirmar el turno</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Te enviaremos los detalles y recordatorio por WhatsApp.
                  </p>
                </div>

                {/* Summary Pill */}
                <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-sky-950 block">{selectedService?.name}</span>
                    <span className="text-sky-700">
                      Fecha: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} a las {selectedSlot} hs
                    </span>
                  </div>
                  <span className="font-bold text-sky-950 text-sm">
                    ${selectedService?.price.toLocaleString()} ARS
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Nombre y Apellido *
                    </label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={e => setPatientName(e.target.value)}
                      placeholder="Ej. Lucas Ferrari"
                      className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      WhatsApp / Celular *
                    </label>
                    <input
                      type="tel"
                      value={patientPhone}
                      onChange={e => setPatientPhone(e.target.value)}
                      placeholder="+54 9 11 1234-5678"
                      className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      DNI (opcional para ficha)
                    </label>
                    <input
                      type="text"
                      value={patientDni}
                      onChange={e => setPatientDni(e.target.value)}
                      placeholder="Ej. 39.120.400"
                      className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={patientEmail}
                      onChange={e => setPatientEmail(e.target.value)}
                      placeholder="lucas@ejemplo.com"
                      className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Motivo de consulta o comentarios
                  </label>
                  <textarea
                    rows={2}
                    value={patientNotes}
                    onChange={e => setPatientNotes(e.target.value)}
                    placeholder="Contanos si tienes alguna duda, dolor puntual o preferencia..."
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-800"
                  >
                    ← Volver a horarios
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Confirmar Reserva de Turno
                  </button>
                </div>
              </form>
            )}

            {/* Step 5: Confirmation Success Screen */}
            {step === 5 && (
              <div className="text-center py-6 space-y-5 max-w-md mx-auto">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    ¡Turno Confirmado con Éxito!
                  </span>
                  <h2 className="text-xl font-bold text-neutral-900 mt-2">
                    Te esperamos, {patientName}
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    Código de reserva: <span className="font-mono font-bold text-neutral-800">{confirmedBookingCode}</span>
                  </p>
                </div>

                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Tratamiento:</span>
                    <span className="font-semibold text-neutral-900">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Fecha y Hora:</span>
                    <span className="font-semibold text-neutral-900">
                      {selectedDate} a las {selectedSlot} hs
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Lugar:</span>
                    <span className="font-semibold text-neutral-900">{practiceSettings.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Arancel estimado:</span>
                    <span className="font-semibold text-neutral-900">${selectedService?.price.toLocaleString()} ARS</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <a
                    href={`https://wa.me/${practiceSettings.whatsapp_number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola! Acabo de reservar mi turno #${confirmedBookingCode} para ${selectedService?.name} el día ${selectedDate} a las ${selectedSlot} hs.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
                  >
                    Enviar confirmación por WhatsApp
                  </a>

                  {onBackToDashboard && (
                    <button
                      onClick={onBackToDashboard}
                      className="w-full py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl transition-colors"
                    >
                      Volver a la Agenda
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
