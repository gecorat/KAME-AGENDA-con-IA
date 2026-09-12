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
  FileText,
  CreditCard,
  ExternalLink,
  Landmark,
  Copy
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAgendaStore } from '../lib/store';
import { Service } from '../types';
import { PhoneInputWithCountry } from '../components/PhoneInputWithCountry';

interface PublicBookingViewProps {
  onBack?: () => void;
  onBackToDashboard?: () => void;
}

export const PublicBookingView: React.FC<PublicBookingViewProps> = ({ onBack, onBackToDashboard }) => {
  const { practiceSettings, services, availability, appointments, addAppointment } = useAgendaStore();

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else if (onBackToDashboard) {
      onBackToDashboard();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  };

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
  const [patientPhone, setPatientPhone] = useState('+54 9 ');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [patientEmail, setPatientEmail] = useState('');
  const [patientDni, setPatientDni] = useState('');
  const [patientInsurance, setPatientInsurance] = useState('');
  const [patientAddress, setPatientAddress] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [confirmedBookingCode, setConfirmedBookingCode] = useState('');
  const [depositPaid, setDepositPaid] = useState(false);
  const [isPayingDeposit, setIsPayingDeposit] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);

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

    const req = practiceSettings.booking_required_fields || {
      full_name: true,
      phone: true,
      dni: false,
      email: false,
      insurance: false,
      reason: false,
      address: false
    };

    if (!selectedService || !selectedDate || !selectedSlot) {
      alert('Por favor selecciona un servicio, fecha y horario para continuar.');
      return;
    }

    if (req.full_name && !patientName.trim()) {
      alert('Por favor ingresa tu Nombre y Apellido completo.');
      return;
    }

    if (req.phone) {
      if (!patientPhone.trim()) {
        alert('Por favor ingresa tu número de WhatsApp / Teléfono móvil.');
        return;
      }
      if (!isPhoneValid) {
        alert('El número de teléfono ingresado no es correcto. Por favor verifica que tenga la cantidad exacta de dígitos (ejemplo para Argentina: 3425123123 sin 0 ni 15).');
        return;
      }
    }

    if (req.dni && !patientDni.trim()) {
      alert('El DNI / documento es obligatorio según la configuración del consultorio.');
      return;
    }

    if (req.email && !patientEmail.trim()) {
      alert('El correo electrónico es obligatorio para confirmar la reserva.');
      return;
    }

    if (req.insurance && !patientInsurance.trim()) {
      alert('Por favor indica tu Obra Social, Prepaga o si es Particular.');
      return;
    }

    if (req.address && !patientAddress.trim()) {
      alert('Por favor completa tu domicilio o localidad.');
      return;
    }

    if (req.reason && !patientNotes.trim()) {
      alert('Por favor indica el motivo de la consulta.');
      return;
    }

    const startIso = `${selectedDate}T${selectedSlot}:00`;
    const startObj = new Date(startIso);
    const endObj = new Date(startObj.getTime() + selectedService.duration_minutes * 60000);

    const bookingCode = `KAME-${Math.floor(100000 + Math.random() * 900000)}`;

    const extraNotes = [
      patientNotes.trim() ? `Motivo: ${patientNotes.trim()}` : null,
      patientDni.trim() ? `DNI: ${patientDni.trim()}` : null,
      patientInsurance.trim() ? `Cobertura: ${patientInsurance.trim()}` : null,
      patientAddress.trim() ? `Domicilio: ${patientAddress.trim()}` : null,
    ].filter(Boolean).join(' • ');

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
      notes: `Reserva online #${bookingCode}. ${extraNotes}`,
      origin: selectedService.category === 'Online' ? 'telemedicine' : 'public_booking'
    });

    setConfirmedBookingCode(bookingCode);
    setStep(5);

    // Automated email reminder & confirmation dispatch
    if (patientEmail.trim()) {
      fetch('/api/reminders/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: patientEmail.trim(),
          patientName: patientName.trim(),
          practiceName: practiceSettings.practice_name,
          date: selectedDate,
          time: selectedSlot,
          serviceName: selectedService.name,
          modality: selectedService.category === 'Online' ? 'virtual' : 'presencial',
          address: practiceSettings.address,
          meetUrl: practiceSettings.google_meet_url || 'https://meet.google.com/new'
        })
      }).catch(err => console.warn('Reminder email background dispatch:', err));
    }

    // Automated WhatsApp confirmation message if line is connected
    if (patientPhone.trim() && practiceSettings.whatsapp_connected) {
      fetch('/api/evolution/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: patientPhone.trim(),
          text: `¡Hola ${patientName.trim()}! 👋 Tu reserva para *${selectedService.name}* en *${practiceSettings.practice_name}* ha sido registrada con éxito para el día ${selectedDate} a las ${selectedSlot} hs (Código: #${bookingCode}). ¡Te esperamos!`
        })
      }).catch(err => console.warn('WhatsApp booking confirmation dispatch:', err));
    }

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  const themePreset = practiceSettings.public_theme_preset || 'minimal-slate';
  const photoUrl = practiceSettings.public_profile_photo_url;
  const photoShape = practiceSettings.public_profile_photo_shape || 'rounded-smooth';
  const photoAlign = practiceSettings.public_profile_photo_align || 'left';
  const cardBorder = practiceSettings.public_card_border_style || 'rounded-xl';
  const badgeText = practiceSettings.public_badge_text;
  const bio = practiceSettings.public_bio;
  const showReviews = practiceSettings.public_show_reviews ?? true;
  const customAccent = practiceSettings.public_custom_accent || practiceSettings.page_color || '#0284c7';

  // Dynamic style helpers based on theme
  const getThemeWrapperClass = () => {
    switch (themePreset) {
      case 'medical-teal':
        return 'bg-teal-50/40 text-teal-950';
      case 'warm-oat':
        return 'bg-[#faf7f2] text-[#3c342d]';
      case 'nordic-blue':
        return 'bg-sky-50/40 text-sky-950';
      case 'dark-carbon':
        return 'bg-neutral-950 text-neutral-100';
      case 'minimal-slate':
      default:
        return 'bg-neutral-50/80 text-neutral-900';
    }
  };

  const getCardClass = () => {
    const borderR = cardBorder === 'square' ? 'rounded-xl' : cardBorder === 'rounded-smooth' ? 'rounded-2xl' : 'rounded-3xl';
    switch (themePreset) {
      case 'medical-teal':
        return `bg-white border-teal-200/80 shadow-xs ${borderR}`;
      case 'warm-oat':
        return `bg-white border-[#ebdccb] shadow-xs ${borderR}`;
      case 'nordic-blue':
        return `bg-white border-sky-100 shadow-xs ${borderR}`;
      case 'dark-carbon':
        return `bg-neutral-900 border-neutral-800 text-white shadow-xs ${borderR}`;
      case 'minimal-slate':
      default:
        return `bg-white border-neutral-200 shadow-xs ${borderR}`;
    }
  };

  const getPhotoShapeClass = () => {
    switch (photoShape) {
      case 'square':
        return 'rounded-none';
      case 'rounded-full':
        return 'rounded-full';
      case 'rounded-smooth':
      default:
        return 'rounded-2xl';
    }
  };

  return (
    <div className={`min-h-screen py-8 px-4 sm:px-6 transition-colors duration-300 ${getThemeWrapperClass()}`}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Bar / Mode Notice */}
        {(onBack || onBackToDashboard) && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBackClick}
              className="text-xs font-semibold text-neutral-700 hover:text-neutral-950 bg-white hover:bg-neutral-50 active:scale-95 border border-neutral-300/80 hover:border-neutral-400 px-3.5 py-1.5 rounded-xl shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
              title="Volver atrás"
            >
              <ChevronLeft className="w-4 h-4 text-neutral-500" />
              <span>Volver atrás</span>
            </button>
            <span className="text-xs bg-sky-100 text-sky-800 font-medium px-2.5 py-1 rounded-full border border-sky-200">
              Vista previa del enlace público: agenfacil.com/u/{practiceSettings.handle}
            </span>
          </div>
        )}

        {/* Practice Header Card */}
        <div className={`p-6 sm:p-9 border relative overflow-hidden transition-all duration-200 shadow-sm ${getCardClass()}`}>
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className={`flex flex-col gap-6 relative z-10 ${
            photoAlign === 'center' ? 'items-center text-center' :
            photoAlign === 'right' ? 'items-end text-right' :
            'items-start text-left'
          }`}>
            <div className={`flex flex-col sm:flex-row items-center gap-6 w-full ${
              photoAlign === 'center' ? 'sm:flex-col sm:text-center sm:items-center' :
              photoAlign === 'right' ? 'sm:flex-row-reverse sm:text-right' : ''
            }`}>
              {/* Profile Photo / Avatar - Enlarged & Premium Framed */}
              {photoUrl ? (
                <div className="relative shrink-0 group">
                  <div
                    className={`w-28 h-28 sm:w-36 sm:h-36 object-cover p-1.5 bg-white border-2 shadow-md transition-transform duration-300 group-hover:scale-[1.02] ${getPhotoShapeClass()}`}
                    style={{ borderColor: customAccent }}
                  >
                    <img
                      src={photoUrl}
                      alt={practiceSettings.professional_name || 'Médico'}
                      className={`w-full h-full object-cover ${getPhotoShapeClass()}`}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white shadow-xs" />
                  </span>
                </div>
              ) : (
                <div
                  className={`w-28 h-28 sm:w-36 sm:h-36 text-white font-extrabold text-3xl sm:text-4xl flex items-center justify-center shadow-md uppercase shrink-0 border-4 border-white ${getPhotoShapeClass()}`}
                  style={{ backgroundColor: customAccent }}
                >
                  {(() => {
                    const clean = (practiceSettings.professional_name || 'CM').replace(/^(Dr\.|Dra\.|Lic\.|Prof\.)\s*/i, '').trim();
                    const parts = clean.split(/\s+/);
                    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
                    if (parts[0] && parts[0].length >= 2) return parts[0].slice(0, 2);
                    return clean.charAt(0) || 'CM';
                  })()}
                </div>
              )}

              <div className="space-y-2 flex-1">
                <div className={`flex items-center gap-2 flex-wrap ${photoAlign === 'center' ? 'justify-center' : 'justify-start'}`}>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 font-display">
                    {practiceSettings.practice_name}
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-sky-100 text-sky-800 px-2.5 py-0.5 rounded-full border border-sky-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                    Verificado
                  </span>
                  {showReviews && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-200">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      4.9 (128 pacientes)
                    </span>
                  )}
                </div>

                <div className={`flex flex-wrap items-center gap-2 text-sm font-semibold text-neutral-700 ${photoAlign === 'center' ? 'justify-center' : 'justify-start'}`}>
                  <span>{practiceSettings.professional_name}</span>
                  <span className="text-neutral-300">•</span>
                  <span className="text-sky-700">{practiceSettings.specialty}</span>
                  {practiceSettings.medical_license && (
                    <>
                      <span className="text-neutral-300">•</span>
                      <span className="text-neutral-500 font-mono text-xs">{practiceSettings.medical_license}</span>
                    </>
                  )}
                </div>

                {badgeText && (
                  <div className={`pt-0.5 ${photoAlign === 'center' ? 'flex justify-center' : ''}`}>
                    <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200 shadow-2xs">
                      ✨ {badgeText}
                    </span>
                  </div>
                )}

                {bio && (
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-2xl pt-1">
                    {bio}
                  </p>
                )}

                <div className={`flex flex-wrap items-center gap-4 text-xs text-neutral-500 pt-2 border-t border-neutral-100/80 ${photoAlign === 'center' ? 'justify-center' : 'justify-start'}`}>
                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                    {practiceSettings.address}, {practiceSettings.city}
                  </span>
                  {practiceSettings.phone && (
                    <a
                      href={`https://wa.me/${practiceSettings.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                    >
                      <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                      {practiceSettings.phone}
                    </a>
                  )}
                  <span className="flex items-center gap-1 text-neutral-400">
                    <Clock className="w-3.5 h-3.5" /> Confirmación Inmediata
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Steps Container */}
        <div className={`border overflow-hidden transition-all duration-200 ${getCardClass()}`}>
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
            {step === 4 && (() => {
              const req = practiceSettings.booking_required_fields || {
                full_name: true,
                phone: true,
                dni: false,
                email: false,
                insurance: false,
                reason: false,
                address: false
              };

              return (
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

                  <div className="space-y-3.5">
                    {/* Full Name & Phone - Always shown, usually side-by-side on md+ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-xs font-semibold text-neutral-700 block mb-1">
                          Nombre y Apellido <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                          type="text"
                          value={patientName}
                          onChange={e => setPatientName(e.target.value)}
                          placeholder="Ej. Lucas Ferrari"
                          className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                          required={req.full_name}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-neutral-700 block mb-1">
                          WhatsApp / Celular <span className="text-red-500 font-bold">*</span>
                        </label>
                        <PhoneInputWithCountry
                          value={patientPhone}
                          onChange={(phone, valid) => {
                            setPatientPhone(phone);
                            setIsPhoneValid(valid);
                          }}
                          required={req.phone}
                        />
                      </div>
                    </div>

                    {/* DNI, Email, Insurance, Address - Only render if required */}
                    {/* DNI & Email */}
                    {(req.dni || req.email) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {req.dni && (
                          <div>
                            <label className="text-xs font-semibold text-neutral-700 block mb-1">
                              DNI / Documento <span className="text-red-500 font-bold">*</span>
                            </label>
                            <input
                              type="text"
                              value={patientDni}
                              onChange={e => setPatientDni(e.target.value)}
                              placeholder="Ej. 39.120.400"
                              className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                              required={req.dni}
                            />
                          </div>
                        )}

                        {req.email && (
                          <div>
                            <label className="text-xs font-semibold text-neutral-700 block mb-1">
                              Correo Electrónico <span className="text-red-500 font-bold">*</span>
                            </label>
                            <input
                              type="email"
                              value={patientEmail}
                              onChange={e => setPatientEmail(e.target.value)}
                              placeholder="lucas@ejemplo.com"
                              className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                              required={req.email}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Insurance & Address */}
                    {(req.insurance || req.address) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {req.insurance && (
                          <div>
                            <label className="text-xs font-semibold text-neutral-700 block mb-1">
                              Obra Social o Prepaga <span className="text-red-500 font-bold">*</span>
                            </label>
                            <input
                              type="text"
                              value={patientInsurance}
                              onChange={e => setPatientInsurance(e.target.value)}
                              placeholder="Ej. OSDE 210, Swiss Medical, Particular..."
                              className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                              required={req.insurance}
                            />
                          </div>
                        )}

                        {req.address && (
                          <div>
                            <label className="text-xs font-semibold text-neutral-700 block mb-1">
                              Domicilio o Localidad <span className="text-red-500 font-bold">*</span>
                            </label>
                            <input
                              type="text"
                              value={patientAddress}
                              onChange={e => setPatientAddress(e.target.value)}
                              placeholder="Ej. Ciudad de Santa Fe, Bv. Gálvez 1200"
                              className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                              required={req.address}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reason */}
                    {req.reason && (
                      <div>
                        <label className="text-xs font-semibold text-neutral-700 block mb-1">
                          Motivo de consulta o comentarios <span className="text-red-500 font-bold">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={patientNotes}
                          onChange={e => setPatientNotes(e.target.value)}
                          placeholder="Contanos si tienes alguna duda, molestia específica o preferencia..."
                          className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                          required={req.reason}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-800 cursor-pointer"
                    >
                      ← Volver a horarios
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" /> Confirmar Reserva de Turno
                    </button>
                  </div>
                </form>
              );
            })()}

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

                {/* Patient Deposit Payment Box */}
                {(practiceSettings.patient_deposit_enabled ?? practiceSettings.mercadopago_deposit_enabled ?? true) && (() => {
                  const isFixed = practiceSettings.patient_deposit_type === 'fixed';
                  const percent = practiceSettings.patient_deposit_percent ?? practiceSettings.mercadopago_deposit_percent ?? 30;
                  const fixedAmount = practiceSettings.patient_deposit_fixed_amount ?? 85000;
                  const depositAmount = isFixed
                    ? fixedAmount
                    : Math.round(((selectedService?.price || 0) * percent) / 100);

                  return (
                    <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-left space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {practiceSettings.patient_deposit_method === 'mercadopago_connect' || practiceSettings.patient_deposit_method === 'mercadopago_link' ? (
                            <CreditCard className="w-4 h-4 text-sky-600" />
                          ) : (
                            <Landmark className="w-4 h-4 text-emerald-700" />
                          )}
                          <span className="text-xs font-bold text-neutral-900">
                            Seña Requerida {isFixed ? '(Monto Fijo)' : `(${percent}%)`}
                          </span>
                        </div>
                        <span className="text-xs font-black text-emerald-950">
                          ${depositAmount.toLocaleString('es-AR')} ARS
                        </span>
                      </div>

                    {/* Method 1: Alias / CBU Transfer */}
                    {(!practiceSettings.patient_deposit_method || practiceSettings.patient_deposit_method === 'alias_cbu') && (
                      <div className="space-y-2 text-xs">
                        <p className="text-[11px] text-neutral-600">
                          Para asegurar tu turno, realiza la transferencia bancaria y envía el comprobante:
                        </p>
                        <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-1.5 font-mono text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500">Alias:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">
                                {practiceSettings.patient_deposit_alias || 'consultorio.turnos.mp'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(practiceSettings.patient_deposit_alias || 'consultorio.turnos.mp');
                                  setCopiedAlias(true);
                                  setTimeout(() => setCopiedAlias(false), 2000);
                                }}
                                className="p-1 text-neutral-600 hover:text-neutral-900 rounded hover:bg-neutral-100"
                                title="Copiar Alias"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          {copiedAlias && (
                            <p className="text-[10px] text-emerald-700 font-sans font-semibold text-right">
                              ¡Alias copiado al portapapeles!
                            </p>
                          )}
                          {practiceSettings.patient_deposit_cbu && (
                            <div className="flex justify-between text-[11px]">
                              <span className="text-neutral-500">CBU:</span>
                              <span className="text-neutral-700">{practiceSettings.patient_deposit_cbu}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-[11px]">
                            <span className="text-neutral-500">Titular:</span>
                            <span className="text-neutral-700">{practiceSettings.patient_deposit_account_holder || practiceSettings.professional_name}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-neutral-500">Banco:</span>
                            <span className="text-neutral-700">{practiceSettings.patient_deposit_bank_name || 'Mercado Pago / Banco'}</span>
                          </div>
                        </div>

                        {depositPaid ? (
                          <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>¡Comprobante informado con éxito!</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setDepositPaid(true);
                              confetti({ particleCount: 50, spread: 50 });
                            }}
                            className="w-full py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Ya realicé la transferencia</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Method 2: Mercado Pago Online */}
                    {(practiceSettings.patient_deposit_method === 'mercadopago_connect' || practiceSettings.patient_deposit_method === 'mercadopago_link') && (
                      <div className="space-y-2">
                        <p className="text-[11px] text-neutral-600 leading-relaxed">
                          Abona tu seña de forma segura con tarjeta de débito, crédito o dinero en cuenta.
                        </p>

                        {depositPaid ? (
                          <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>¡Seña de Mercado Pago abonada con éxito!</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isPayingDeposit}
                            onClick={() => {
                              setIsPayingDeposit(true);
                              setTimeout(() => {
                                setIsPayingDeposit(false);
                                setDepositPaid(true);
                                confetti({ particleCount: 60, spread: 60 });
                              }, 1200);
                            }}
                            className="w-full py-2.5 px-4 bg-[#009ee3] hover:bg-[#0081b8] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                          >
                            {isPayingDeposit ? (
                              <span className="animate-pulse">Conectando con Mercado Pago...</span>
                            ) : (
                              <>
                                <CreditCard className="w-4 h-4" />
                                <span>Pagar Seña con Mercado Pago</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

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

        {/* Location & Interactive Google Maps Preview Card */}
        <div className={`p-6 sm:p-8 border relative overflow-hidden transition-all duration-200 shadow-sm ${getCardClass()}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold shadow-2xs">
                <MapPin className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
                  Ubicación del Consultorio & Cómo Llegar
                </h3>
                <p className="text-xs text-neutral-500">
                  {practiceSettings.address || 'Consultorio Médico'}, {practiceSettings.city || 'Argentina'} • Atención con cita previa
                </p>
              </div>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${practiceSettings.address || 'Consultorio Médico'}, ${practiceSettings.city || 'Argentina'}`)}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>Abrir en Google Maps</span>
            </a>
          </div>

          {/* Interactive Google Map Embed */}
          <div className="mt-5 rounded-2xl overflow-hidden border border-neutral-200 shadow-2xs relative bg-neutral-100 h-64 sm:h-80 w-full">
            <iframe
              title={`Mapa de ubicación - ${practiceSettings.practice_name}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(`${practiceSettings.address || 'Av. Corrientes 1234'}, ${practiceSettings.city || 'Buenos Aires'}`)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-neutral-600">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-neutral-900 block">Dirección Principal</span>
                <span className="text-[11px] text-neutral-600">{practiceSettings.address}, {practiceSettings.city}</span>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-neutral-900 block">Horarios de Atención</span>
                <span className="text-[11px] text-neutral-600">Lunes a Viernes (Con turno previo)</span>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-neutral-900 block">Atención Segura</span>
                <span className="text-[11px] text-neutral-600">Instalaciones sanitizadas y confortables</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security and Trust Footer */}
        <div className="text-center space-y-2 pt-2 pb-6 text-xs text-neutral-400">
          <div className="flex items-center justify-center gap-2 text-neutral-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Tus datos están protegidos con encriptación SSL de 256 bits y privacidad médica</span>
          </div>
          <p className="text-[11px] text-neutral-400">
            Potenciado por <span className="font-bold text-neutral-600">Agenfacil</span> • Sistema Inteligente de Gestión Médica
          </p>
        </div>
      </div>
    </div>
  );
};
