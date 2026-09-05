import React, { useState } from 'react';
import { X, MessageSquare, ExternalLink, Copy, Check, Send, CheckCheck } from 'lucide-react';
import { Appointment } from '../types';
import { useAgendaStore } from '../lib/store';

interface WhatsAppPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  timing?: '24h' | '2h' | 'manual';
}

export const WhatsAppPreviewModal: React.FC<WhatsAppPreviewModalProps> = ({
  isOpen,
  onClose,
  appointment,
  timing: initialTiming = '24h'
}) => {
  const { practiceSettings, reminderConfig, formatReminderText, sendWhatsAppReminder } = useAgendaStore();
  const [selectedTiming, setSelectedTiming] = useState<'24h' | '2h'>(initialTiming === '2h' ? '2h' : '24h');
  const [copied, setCopied] = useState(false);
  const [sentNotice, setSentNotice] = useState(false);

  if (!isOpen || !appointment) return null;

  const template = selectedTiming === '2h'
    ? reminderConfig.whatsapp_template_2h
    : reminderConfig.whatsapp_template_24h;

  const message = formatReminderText(template, appointment);
  const cleanPhone = appointment.patient_phone.replace(/\D/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendAndOpenWA = () => {
    sendWhatsAppReminder(appointment.id, selectedTiming);
    setSentNotice(true);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => {
      setSentNotice(false);
      onClose();
    }, 1500);
  };

  const handleSimulateLog = () => {
    sendWhatsAppReminder(appointment.id, selectedTiming);
    setSentNotice(true);
    setTimeout(() => {
      setSentNotice(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-neutral-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Recordatorio por WhatsApp</h3>
              <p className="text-[11px] text-neutral-500">
                Para {appointment.patient_name} ({appointment.patient_phone})
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Timing Selector Switch */}
          <div className="flex items-center gap-2 p-1 bg-neutral-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedTiming('24h')}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all ${
                selectedTiming === '24h'
                  ? 'bg-white text-neutral-900 shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Plantilla 24 hs antes
            </button>
            <button
              type="button"
              onClick={() => setSelectedTiming('2h')}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all ${
                selectedTiming === '2h'
                  ? 'bg-white text-neutral-900 shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Plantilla 2 hs antes (Inmediato)
            </button>
          </div>

          {/* WhatsApp Chat Simulation Frame */}
          <div className="rounded-2xl border border-neutral-300 overflow-hidden shadow-xs bg-[#efeae2] flex flex-col">
            {/* WA Chat Bar */}
            <div className="bg-[#075e54] text-white px-3.5 py-2.5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold">
                {appointment.patient_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate leading-tight">{appointment.patient_name}</p>
                <p className="text-[10px] text-emerald-200">en línea</p>
              </div>
              <span className="text-[10px] bg-emerald-700/80 px-2 py-0.5 rounded-full text-white">
                {practiceSettings.practice_name}
              </span>
            </div>

            {/* WA Messages Canvas */}
            <div className="p-4 space-y-2.5 min-h-[160px] bg-[radial-gradient(#0000000a_1px,transparent_1px)] [background-size:16px_16px]">
              <div className="flex justify-center">
                <span className="px-2 py-0.5 rounded-md bg-white/80 text-[10px] text-neutral-600 shadow-2xs font-medium">
                  Hoy
                </span>
              </div>

              {/* Speech Bubble */}
              <div className="flex justify-end">
                <div className="max-w-[88%] bg-[#dcf8c6] text-neutral-900 rounded-2xl rounded-tr-xs p-3 text-xs shadow-xs space-y-1.5 relative border border-emerald-100">
                  <p className="whitespace-pre-wrap leading-relaxed select-text font-normal">
                    {message}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[10px] text-neutral-500 pt-1">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info hint */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs text-neutral-600 flex items-start gap-2">
            <span className="text-emerald-600 font-bold">💡 Tip:</span>
            <span>
              Al presionar <strong>"Abrir en WhatsApp"</strong> se abrirá WhatsApp Web o la App oficial en el celular con el mensaje ya cargado y listo para despachar.
            </span>
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
            {copied ? '¡Copiado!' : 'Copiar'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateLog}
              className="px-3 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
            >
              Registrar Envío
            </button>
            <button
              type="button"
              onClick={handleSendAndOpenWA}
              disabled={sentNotice}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              {sentNotice ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  ¡Enviado!
                </>
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir en WhatsApp
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
