import React from 'react';
import { X, Printer, Send, Pill, FileText, CheckCircle, ShieldCheck } from 'lucide-react';
import { MedicalPrescription, PracticeSettings } from '../types';

interface PrescriptionPrintModalProps {
  prescription: MedicalPrescription;
  practiceSettings: PracticeSettings;
  onClose: () => void;
}

export const PrescriptionPrintModal: React.FC<PrescriptionPrintModalProps> = ({
  prescription,
  practiceSettings,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    if (!prescription.patient_phone) return;
    
    // Format message
    let medList = prescription.items
      .map((item, idx) => `${idx + 1}. *${item.medication}*\n   • Dosis: ${item.dosage}\n   • Duración: ${item.duration}${item.instructions ? `\n   • Indicaciones: ${item.instructions}` : ''}`)
      .join('\n\n');

    const message = `📋 *RECETA MÉDICA DIGITAL - ${practiceSettings.practice_name}*\n\n` +
      `👤 *Paciente:* ${prescription.patient_name}\n` +
      `📅 *Fecha:* ${new Date(prescription.date).toLocaleDateString('es-AR')}\n` +
      `🔢 *Nº Receta:* ${prescription.prescription_number}\n` +
      (prescription.diagnosis ? `🩺 *Diagnóstico:* ${prescription.diagnosis}\n\n` : '\n') +
      `💊 *MEDICAMENTOS INDICADOS:*\n${medList}\n\n` +
      `👨‍⚕️ *Profesional:* ${prescription.professional_name}\n` +
      `📜 *Matrícula:* ${prescription.medical_license || practiceSettings.medical_license || 'En trámite'}\n\n` +
      `_Esta receta fue emitida electrónicamente a través de AgendaPro AI._`;

    const cleanPhone = prescription.patient_phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Action Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Receta Médica Oficial</h3>
              <p className="text-xs text-slate-500">Nº {prescription.prescription_number}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-print-prescription"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / PDF
            </button>

            {prescription.patient_phone && (
              <button
                type="button"
                id="btn-whatsapp-prescription"
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

        {/* Printable Document Sheet */}
        <div id="printable-prescription-sheet" className="p-8 sm:p-10 bg-white text-slate-900 space-y-6">
          {/* Practice Header Letterhead */}
          <div className="border-b-2 border-sky-600 pb-5 flex flex-wrap justify-between items-start gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{practiceSettings.practice_name}</h1>
              <p className="text-sm font-medium text-sky-700">{prescription.professional_name}</p>
              <p className="text-xs text-slate-500">{practiceSettings.professional_title} • {practiceSettings.specialty}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Matrícula: <strong className="text-slate-700">{prescription.medical_license || practiceSettings.medical_license || "M.N. 142.890"}</strong>
              </p>
            </div>
            <div className="text-right text-xs text-slate-500 space-y-0.5">
              <p className="font-medium text-slate-700">{practiceSettings.address}</p>
              <p>{practiceSettings.city}</p>
              <p>Tel / WhatsApp: {practiceSettings.whatsapp_number}</p>
              <p>{practiceSettings.email}</p>
            </div>
          </div>

          {/* Patient Details Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Paciente</span>
              <span className="text-slate-900 font-bold text-sm">{prescription.patient_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">DNI / Identificación</span>
              <span className="text-slate-800 font-medium">{prescription.patient_dni || 'No informado'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Fecha de emisión</span>
              <span className="text-slate-800 font-medium">{new Date(prescription.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Diagnosis if present */}
          {prescription.diagnosis && (
            <div className="px-1 text-xs">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px] mr-2">Diagnóstico clínico:</span>
              <span className="text-slate-800 font-medium">{prescription.diagnosis}</span>
            </div>
          )}

          {/* Rx Medication Items */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="text-2xl font-serif italic text-sky-700 font-bold">Rp/</span>
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500">Prescripción Farmacológica</span>
            </div>

            <div className="space-y-4">
              {prescription.items.map((item, index) => (
                <div key={item.id || index} className="p-3.5 bg-sky-50/40 border border-sky-100 rounded-xl">
                  <div className="flex items-baseline justify-between mb-1">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-xs flex items-center justify-center font-bold font-mono">
                        {index + 1}
                      </span>
                      {item.medication}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 mt-2 pl-7">
                    <p><strong className="text-slate-900 font-semibold">Dosis:</strong> {item.dosage}</p>
                    <p><strong className="text-slate-900 font-semibold">Duración:</strong> {item.duration}</p>
                    {item.instructions && (
                      <p className="sm:col-span-2 text-slate-600 italic">
                        <strong className="text-slate-900 font-semibold not-italic">Indicaciones:</strong> {item.instructions}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Doctor Signature & Legal Verification */}
          <div className="pt-10 flex justify-between items-end border-t border-slate-200 text-xs text-slate-500">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-sky-800 font-medium">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                <span>Documento emitido electrónicamente</span>
              </div>
              <p className="text-[11px] text-slate-400">Válido en farmacias según reglamentación vigente.</p>
              <p className="text-[11px] text-slate-400 font-mono">ID Receta: {prescription.id}</p>
            </div>

            <div className="text-center w-56">
              <div className="h-16 border-b border-dashed border-slate-400 flex items-center justify-center">
                <span className="font-serif italic text-sky-700 text-sm opacity-80 select-none">
                  {prescription.professional_name}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 mt-1">{prescription.professional_name}</p>
              <p className="text-[11px] text-slate-500 font-mono">
                {prescription.medical_license || practiceSettings.medical_license || 'M.N. 142.890'}
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Firma y Sello</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
