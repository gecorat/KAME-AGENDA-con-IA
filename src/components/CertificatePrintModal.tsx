import React from 'react';
import { X, Printer, Send, Award, FileCheck, ShieldCheck } from 'lucide-react';
import { MedicalCertificate, PracticeSettings } from '../types';

interface CertificatePrintModalProps {
  certificate: MedicalCertificate;
  practiceSettings: PracticeSettings;
  patientPhone?: string;
  onClose: () => void;
}

export const CertificatePrintModal: React.FC<CertificatePrintModalProps> = ({
  certificate,
  practiceSettings,
  patientPhone,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'reposo':
        return 'Certificado de Reposo Médico';
      case 'asistencia':
        return 'Constancia de Atención y Asistencia';
      case 'aptitud_fisica':
        return 'Certificado de Aptitud Física';
      case 'alta':
        return 'Certificado de Alta Médica';
      default:
        return 'Certificado Médico';
    }
  };

  const handleSendWhatsApp = () => {
    if (!patientPhone) return;

    const message = `📄 *${getTypeName(certificate.type).toUpperCase()}*\n` +
      `*${practiceSettings.practice_name}*\n\n` +
      `👤 *Paciente:* ${certificate.patient_name}\n` +
      (certificate.patient_dni ? `🆔 *DNI:* ${certificate.patient_dni}\n` : '') +
      `📅 *Fecha:* ${new Date(certificate.date).toLocaleDateString('es-AR')}\n` +
      (certificate.rest_days ? `🛌 *Días de reposo indicados:* ${certificate.rest_days} día(s)\n` : '') +
      (certificate.start_date ? `📆 *Período:* Desde ${certificate.start_date} hasta ${certificate.end_date || 'alta'}\n\n` : '\n') +
      `📝 *Constancia:* "${certificate.content}"\n\n` +
      `👨‍⚕️ *Profesional:* ${certificate.professional_name}\n` +
      `📜 *Matrícula:* ${certificate.medical_license || practiceSettings.medical_license || 'En trámite'}\n\n` +
      `_Emitido electrónicamente vía AgendaPro AI._`;

    const cleanPhone = patientPhone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{getTypeName(certificate.type)}</h3>
              <p className="text-xs text-slate-500">Nº {certificate.certificate_number}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-print-certificate"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / PDF
            </button>

            {patientPhone && (
              <button
                type="button"
                id="btn-whatsapp-certificate"
                onClick={handleSendWhatsApp}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Enviar por WhatsApp
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Sheet Content */}
        <div id="printable-certificate-sheet" className="p-8 sm:p-12 bg-white text-slate-900 space-y-8">
          {/* Practice Header Letterhead */}
          <div className="border-b-2 border-emerald-600 pb-5 flex flex-wrap justify-between items-start gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{practiceSettings.practice_name}</h1>
              <p className="text-sm font-medium text-emerald-700">{certificate.professional_name}</p>
              <p className="text-xs text-slate-500">{practiceSettings.professional_title} • {practiceSettings.specialty}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Matrícula: <strong className="text-slate-700">{certificate.medical_license || practiceSettings.medical_license || "M.N. 142.890"}</strong>
              </p>
            </div>
            <div className="text-right text-xs text-slate-500 space-y-0.5">
              <p className="font-medium text-slate-700">{practiceSettings.address}</p>
              <p>{practiceSettings.city}</p>
              <p>Tel: {practiceSettings.phone}</p>
            </div>
          </div>

          {/* Certificate Title */}
          <div className="text-center pt-2">
            <h2 className="text-lg font-serif font-bold uppercase tracking-wider text-slate-900">
              {getTypeName(certificate.type)}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Constancia Oficial Nº {certificate.certificate_number}</p>
          </div>

          {/* Recipient */}
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Para presentar ante: <span className="text-slate-900 font-bold">{certificate.presented_to || 'A quien corresponda'}</span>
          </div>

          {/* Main Body Text */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-6 text-sm sm:text-base leading-relaxed text-slate-800 font-serif">
            <p className="indent-6 text-justify">
              {certificate.content}
            </p>

            {certificate.rest_days && certificate.rest_days > 0 && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-sans text-emerald-900 flex items-center justify-between">
                <div>
                  <strong className="font-bold">Indicación de reposo laboral / físico:</strong>{' '}
                  <span>{certificate.rest_days} días corridos.</span>
                </div>
                {certificate.start_date && (
                  <span className="font-medium text-emerald-700">
                    Desde {certificate.start_date} {certificate.end_date ? `hasta ${certificate.end_date}` : ''}
                  </span>
                )}
              </div>
            )}

            {certificate.diagnosis && (
              <p className="mt-4 text-xs font-sans text-slate-500">
                <strong className="text-slate-700">Diagnóstico facultativo:</strong> {certificate.diagnosis}
              </p>
            )}
          </div>

          {/* Location & Date */}
          <div className="text-right text-xs text-slate-600">
            <p>{practiceSettings.city}, {new Date(certificate.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
          </div>

          {/* Footer Signature */}
          <div className="pt-8 flex justify-between items-end border-t border-slate-200 text-xs text-slate-500">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Documento oficial con firma profesional</span>
              </div>
              <p className="text-[11px] text-slate-400">Generado de forma segura en AgendaPro AI.</p>
            </div>

            <div className="text-center w-56">
              <div className="h-16 border-b border-dashed border-slate-400 flex items-center justify-center">
                <span className="font-serif italic text-emerald-700 text-sm opacity-80 select-none">
                  {certificate.professional_name}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 mt-1">{certificate.professional_name}</p>
              <p className="text-[11px] text-slate-500 font-mono">
                {certificate.medical_license || practiceSettings.medical_license || 'M.N. 142.890'}
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Firma y Matrícula Profesional</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
