import React, { useState } from 'react';
import { X, Mail, Check, Copy, Send, Calendar, Clock, MapPin, User, Stethoscope } from 'lucide-react';
import { Appointment } from '../types';
import { useAgendaStore } from '../lib/store';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  timing?: '24h' | '2h' | 'manual';
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  isOpen,
  onClose,
  appointment,
  timing = '24h'
}) => {
  const { practiceSettings, reminderConfig, formatReminderText, sendEmailReminder } = useAgendaStore();
  const [copied, setCopied] = useState(false);
  const [sentNotice, setSentNotice] = useState(false);

  if (!isOpen || !appointment) return null;

  const subjectTemplate = timing === '2h'
    ? reminderConfig.email_subject_2h
    : reminderConfig.email_subject_24h;

  const bodyTemplate = timing === '2h'
    ? reminderConfig.email_body_2h
    : reminderConfig.email_body_24h;

  const subject = formatReminderText(subjectTemplate, appointment);
  const bodyText = formatReminderText(bodyTemplate, appointment);

  const aptDate = new Date(appointment.start_datetime);
  const formattedDate = aptDate.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = aptDate.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(`Asunto: ${subject}\n\n${bodyText}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = () => {
    sendEmailReminder(appointment.id, timing);
    setSentNotice(true);
    setTimeout(() => {
      setSentNotice(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-neutral-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Vista Previa de Correo Automatizado</h3>
              <p className="text-[11px] text-neutral-500">
                Plantilla HTML responsive enviada a {appointment.patient_email || 'correo del paciente'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Simulated Email Client */}
        <div className="p-5 overflow-y-auto space-y-4 bg-neutral-100/50">
          {/* Email Envelope Meta */}
          <div className="bg-white rounded-xl border border-neutral-200 p-3.5 space-y-1.5 text-xs text-neutral-700">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
              <span className="text-neutral-400 font-medium">De:</span>
              <span className="font-semibold text-neutral-900">
                {reminderConfig.sender_email_alias} &lt;{practiceSettings.email}&gt;
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
              <span className="text-neutral-400 font-medium">Para:</span>
              <span className="font-semibold text-neutral-900">
                {appointment.patient_name} &lt;{appointment.patient_email || 'sin-correo@registrado.com'}&gt;
              </span>
            </div>
            <div className="flex items-start justify-between pt-0.5">
              <span className="text-neutral-400 font-medium shrink-0 mr-2">Asunto:</span>
              <span className="font-bold text-neutral-950 text-right">{subject}</span>
            </div>
          </div>

          {/* Email Template Card */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
            {/* Branded Header */}
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 p-6 text-white text-center">
              <div className="w-10 h-10 mx-auto mb-2 bg-white/20 backdrop-blur-xs rounded-xl flex items-center justify-center text-white">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold tracking-tight">{practiceSettings.practice_name}</h2>
              <p className="text-xs text-sky-100">{practiceSettings.professional_title}</p>
            </div>

            {/* Email Content */}
            <div className="p-6 space-y-5 text-neutral-800 text-sm">
              <div className="space-y-1">
                <p className="font-semibold text-neutral-900">Estimado/a {appointment.patient_name},</p>
                <p className="text-neutral-600 text-xs leading-relaxed">
                  Le recordamos su próximo turno reservado para su atención en nuestro consultorio.
                </p>
              </div>

              {/* Appointment Card */}
              <div className="bg-sky-50/60 rounded-xl border border-sky-100 p-4 space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-sky-950">
                  <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="capitalize font-semibold">{formattedDate}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-sky-950">
                  <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="font-bold text-sky-900">{formattedTime} hs</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-sky-950">
                  <Stethoscope className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="font-medium">{appointment.service_name}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-sky-950">
                  <User className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="font-medium">{practiceSettings.professional_name}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-sky-950">
                  <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>{practiceSettings.address}, {practiceSettings.city}</span>
                </div>
              </div>

              {/* Call to Action Button */}
              <div className="pt-2 text-center space-y-2">
                <button
                  type="button"
                  onClick={() => alert(`Enlace de confirmación simulado para el turno de ${appointment.patient_name}`)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Confirmar Asistencia con 1 Clic
                </button>
                <p className="text-[11px] text-neutral-400">
                  Al confirmar, su lugar en la agenda quedará automáticamente validado.
                </p>
              </div>

              {/* Footer text */}
              <div className="pt-4 border-t border-neutral-100 text-center text-xs text-neutral-500 space-y-1">
                <p>¿Necesita reprogramar o cancelar? Escríbanos a WhatsApp al {practiceSettings.whatsapp_number}</p>
                <p className="text-[10px] text-neutral-400">
                  {practiceSettings.practice_name} • {practiceSettings.address} • {practiceSettings.city}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-neutral-100 flex items-center justify-between bg-white">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '¡Copiado!' : 'Copiar Texto'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 rounded-xl transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={sentNotice}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              {sentNotice ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  ¡Correo Despachado!
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Enviar Correo Ahora
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
