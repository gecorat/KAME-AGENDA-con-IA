import React, { useState } from 'react';
import {
  FileText,
  Mic,
  Plus,
  Search,
  Calendar,
  User,
  Pill,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Printer,
  Trash2,
  Edit3,
  CheckCircle2,
  Filter,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { ConsultationRecord, MedicalCertificate } from '../types';
import { ConsultationModal } from '../components/ConsultationModal';
import { PrescriptionPrintModal } from '../components/PrescriptionPrintModal';
import { CertificatePrintModal } from '../components/CertificatePrintModal';

export const ConsultationsView: React.FC = () => {
  const {
    consultations,
    patients,
    practiceSettings,
    deleteConsultation
  } = useAgendaStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string>('all');
  const [expandedConsultationId, setExpandedConsultationId] = useState<string | null>(null);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingConsultation, setEditingConsultation] = useState<ConsultationRecord | null>(null);
  const [activePrescriptionToPrint, setActivePrescriptionToPrint] = useState<{
    consultation: ConsultationRecord;
  } | null>(null);
  const [activeCertificateToPrint, setActiveCertificateToPrint] = useState<{
    certificate: MedicalCertificate;
    patientPhone?: string;
  } | null>(null);

  // Audio playback state for demo / attached audio
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Metrics
  const totalConsultations = consultations.length;
  const totalVoiceNotes = consultations.reduce((acc, c) => acc + (c.voice_notes?.length || 0), 0);
  const totalPrescriptions = consultations.reduce((acc, c) => acc + (c.prescriptions?.length || 0), 0);
  const totalCertificates = consultations.reduce((acc, c) => acc + (c.certificates?.length || 0), 0);

  // Filtered list
  const filteredConsultations = consultations.filter((c) => {
    const matchesPatient = selectedPatientFilter === 'all' || c.patient_id === selectedPatientFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      c.patient_name.toLowerCase().includes(searchLower) ||
      c.reason_for_visit.toLowerCase().includes(searchLower) ||
      (c.soap_analysis && c.soap_analysis.toLowerCase().includes(searchLower)) ||
      (c.soap_plan && c.soap_plan.toLowerCase().includes(searchLower)) ||
      (c.prescriptions && c.prescriptions.some(p => p.medication.toLowerCase().includes(searchLower)));

    return matchesPatient && matchesSearch;
  });

  const toggleAudio = (id: string) => {
    if (playingAudioId === id) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(id);
    }
  };

  return (
    <div id="consultations-view" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Historias Clínicas & Evolución
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
              Notas de Voz & SOAP
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Registro médico electrónico de consultas, dictado con transcripción inteligente de voz y recetas oficiales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-new-consultation"
            onClick={() => {
              setEditingConsultation(null);
              setIsNewModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Nueva Consulta con Voz
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Consultas</span>
            <FileText className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalConsultations}</div>
          <p className="text-[11px] text-slate-500 mt-1">Evoluciones clínicas guardadas</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notas de Voz</span>
            <Mic className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{totalVoiceNotes}</div>
          <p className="text-[11px] text-slate-500 mt-1">Procesadas por Gemini IA</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recetas Rp/</span>
            <Pill className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-600">{totalPrescriptions}</div>
          <p className="text-[11px] text-slate-500 mt-1">Medicamentos prescritos</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Certificados</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{totalCertificates}</div>
          <p className="text-[11px] text-slate-500 mt-1">Reposo y constancias</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por paciente, diagnóstico, síntoma o fármaco prescrito..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedPatientFilter}
            onChange={(e) => setSelectedPatientFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">Todos los pacientes</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Consultations List */}
      <div className="space-y-4">
        {filteredConsultations.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 mx-auto flex items-center justify-center mb-3">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No se encontraron consultas clínicas</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Registra una nueva consulta para este paciente, utilizando el dictado de notas de voz o el método SOAP tradicional.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingConsultation(null);
                setIsNewModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear Primera Consulta
            </button>
          </div>
        ) : (
          filteredConsultations.map((consultation) => {
            const isExpanded = expandedConsultationId === consultation.id;
            const patientObj = patients.find(p => p.id === consultation.patient_id);
            const hasVoiceNotes = consultation.voice_notes && consultation.voice_notes.length > 0;
            const hasPrescriptions = consultation.prescriptions && consultation.prescriptions.length > 0;
            const hasCertificates = consultation.certificates && consultation.certificates.length > 0;

            return (
              <div
                key={consultation.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-all"
              >
                {/* Consultation Card Header */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 border-b border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold flex-shrink-0">
                      <User className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          {consultation.patient_name}
                        </h3>
                        {patientObj?.dni && (
                          <span className="text-xs text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                            DNI: {patientObj.dni}
                          </span>
                        )}
                        {hasVoiceNotes && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <Mic className="w-3 h-3 text-rose-600" />
                            Nota de Voz ({consultation.voice_notes.length})
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(consultation.date).toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">
                          {consultation.reason_for_visit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {hasPrescriptions && (
                      <button
                        type="button"
                        onClick={() => setActivePrescriptionToPrint({ consultation })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors"
                        title="Ver e imprimir receta médica oficial"
                      >
                        <Pill className="w-3.5 h-3.5" />
                        Receta ({consultation.prescriptions!.length})
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setEditingConsultation(consultation);
                        setIsNewModalOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg text-xs transition-colors"
                      title="Editar ficha"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`¿Eliminar la ficha de consulta de ${consultation.patient_name}?`)) {
                          deleteConsultation(consultation.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs transition-colors"
                      title="Eliminar consulta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedConsultationId(isExpanded ? null : consultation.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      {isExpanded ? 'Ocultar' : 'Ver Detalle'}
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Voice Note Quick Bar if attached */}
                {hasVoiceNotes && (
                  <div className="px-5 py-3 bg-rose-50/40 border-b border-rose-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleAudio(consultation.voice_notes[0].id)}
                        className="w-8 h-8 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xs transition-transform active:scale-95"
                      >
                        {playingAudioId === consultation.voice_notes[0].id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {consultation.voice_notes[0].title || 'Nota de audio grabada en consulta'}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            ({consultation.voice_notes[0].duration_seconds}s)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                          "{consultation.voice_notes[0].transcription}"
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] text-rose-700 font-semibold bg-rose-100/70 px-2 py-0.5 rounded-full">
                      Gemini IA Transcrito
                    </span>
                  </div>
                )}

                {/* Expanded Details: SOAP Breakdown, Prescriptions & Certificates */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 space-y-6">
                    {/* Vital Signs Bar if present */}
                    {consultation.vital_signs && Object.values(consultation.vital_signs).some(Boolean) && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-4 text-xs">
                        {consultation.vital_signs.blood_pressure && (
                          <div>
                            <span className="text-slate-400 block text-[10px] font-semibold">PA:</span>
                            <span className="font-mono font-bold text-slate-800">{consultation.vital_signs.blood_pressure}</span>
                          </div>
                        )}
                        {consultation.vital_signs.heart_rate && (
                          <div>
                            <span className="text-slate-400 block text-[10px] font-semibold">FC:</span>
                            <span className="font-mono font-bold text-slate-800">{consultation.vital_signs.heart_rate}</span>
                          </div>
                        )}
                        {consultation.vital_signs.temperature && (
                          <div>
                            <span className="text-slate-400 block text-[10px] font-semibold">Temp:</span>
                            <span className="font-mono font-bold text-slate-800">{consultation.vital_signs.temperature} °C</span>
                          </div>
                        )}
                        {consultation.vital_signs.weight_kg && (
                          <div>
                            <span className="text-slate-400 block text-[10px] font-semibold">Peso:</span>
                            <span className="font-mono font-bold text-slate-800">{consultation.vital_signs.weight_kg} kg</span>
                          </div>
                        )}
                        {consultation.vital_signs.height_cm && (
                          <div>
                            <span className="text-slate-400 block text-[10px] font-semibold">Talla:</span>
                            <span className="font-mono font-bold text-slate-800">{consultation.vital_signs.height_cm} cm</span>
                          </div>
                        )}
                        {consultation.vital_signs.oxygen_sat && (
                          <div>
                            <span className="text-slate-400 block text-[10px] font-semibold">Sat O2:</span>
                            <span className="font-mono font-bold text-slate-800">{consultation.vital_signs.oxygen_sat}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SOAP Evolution Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* S: Subjetivo */}
                      <div className="p-4 bg-sky-50/40 border border-sky-100 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800">
                          <span className="w-5 h-5 rounded bg-sky-200 text-sky-800 flex items-center justify-center font-mono font-bold text-[11px]">
                            S
                          </span>
                          Subjetivo (Anamnesis)
                        </div>
                        <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                          {consultation.soap_subjective || 'Sin datos subjetivos registrados.'}
                        </p>
                      </div>

                      {/* O: Objetivo */}
                      <div className="p-4 bg-teal-50/40 border border-teal-100 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800">
                          <span className="w-5 h-5 rounded bg-teal-200 text-teal-800 flex items-center justify-center font-mono font-bold text-[11px]">
                            O
                          </span>
                          Objetivo (Examen Clínico)
                        </div>
                        <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                          {consultation.soap_objective || 'Sin hallazgos clínicos registrados.'}
                        </p>
                      </div>

                      {/* A: Análisis / Diagnóstico */}
                      <div className="p-4 bg-amber-50/40 border border-amber-100 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                          <span className="w-5 h-5 rounded bg-amber-200 text-amber-800 flex items-center justify-center font-mono font-bold text-[11px]">
                            A
                          </span>
                          Análisis (Diagnóstico)
                        </div>
                        <p className="text-xs font-semibold text-slate-800 whitespace-pre-line leading-relaxed">
                          {consultation.soap_analysis || 'Diagnóstico no especificado.'}
                        </p>
                      </div>

                      {/* P: Plan Terapéutico */}
                      <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800">
                          <span className="w-5 h-5 rounded bg-indigo-200 text-indigo-800 flex items-center justify-center font-mono font-bold text-[11px]">
                            P
                          </span>
                          Plan Terapéutico
                        </div>
                        <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                          {consultation.soap_plan || 'Sin pautas registradas.'}
                        </p>
                      </div>
                    </div>

                    {/* Prescriptions strip if any */}
                    {hasPrescriptions && (
                      <div className="space-y-2 border-t border-slate-100 pt-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Pill className="w-3.5 h-3.5 text-indigo-600" />
                            Receta Emitida en esta Consulta
                          </h4>
                          <button
                            type="button"
                            onClick={() => setActivePrescriptionToPrint({ consultation })}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Imprimir Receta Oficial
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {consultation.prescriptions!.map((p, i) => (
                            <div key={p.id || i} className="p-3 bg-white border border-slate-200 rounded-lg text-xs">
                              <h5 className="font-bold text-slate-900">{p.medication}</h5>
                              <p className="text-slate-600">{p.dosage} • {p.duration}</p>
                              {p.instructions && <p className="text-slate-400 italic mt-0.5">{p.instructions}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Certificates strip if any */}
                    {hasCertificates && (
                      <div className="space-y-2 border-t border-slate-100 pt-4">
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-emerald-600" />
                          Certificados Médicos Oficiales
                        </h4>

                        <div className="space-y-2">
                          {consultation.certificates!.map((cert) => (
                            <div key={cert.id} className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-emerald-900">
                                  {cert.type === 'reposo' ? 'Certificado de Reposo' : cert.type === 'asistencia' ? 'Constancia de Asistencia' : 'Aptitud Física'}
                                </span>
                                <span className="text-slate-500 font-mono ml-2">Nº {cert.certificate_number}</span>
                                <p className="text-slate-600 line-clamp-1 mt-0.5">{cert.content}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setActiveCertificateToPrint({ certificate: cert, patientPhone: patientObj?.phone })}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-emerald-300 text-emerald-700 font-semibold rounded-md hover:bg-emerald-100"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Ver / Imprimir
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Main Consultation Editor / Creator Modal */}
      {isNewModalOpen && (
        <ConsultationModal
          consultation={editingConsultation}
          onClose={() => {
            setIsNewModalOpen(false);
            setEditingConsultation(null);
          }}
        />
      )}

      {/* Prescription Printable Sheet Modal */}
      {activePrescriptionToPrint && (
        <PrescriptionPrintModal
          prescription={{
            id: `rx-${activePrescriptionToPrint.consultation.id}`,
            prescription_number: `RX-2026-${activePrescriptionToPrint.consultation.id.slice(-4)}`,
            patient_id: activePrescriptionToPrint.consultation.patient_id,
            patient_name: activePrescriptionToPrint.consultation.patient_name,
            patient_dni: patients.find(p => p.id === activePrescriptionToPrint.consultation.patient_id)?.dni,
            patient_phone: patients.find(p => p.id === activePrescriptionToPrint.consultation.patient_id)?.phone,
            items: activePrescriptionToPrint.consultation.prescriptions || [],
            diagnosis: activePrescriptionToPrint.consultation.soap_analysis || activePrescriptionToPrint.consultation.reason_for_visit,
            professional_name: practiceSettings.professional_name,
            medical_license: practiceSettings.medical_license,
            date: activePrescriptionToPrint.consultation.date,
            status: 'active'
          }}
          practiceSettings={practiceSettings}
          onClose={() => setActivePrescriptionToPrint(null)}
        />
      )}

      {/* Certificate Printable Sheet Modal */}
      {activeCertificateToPrint && (
        <CertificatePrintModal
          certificate={activeCertificateToPrint.certificate}
          practiceSettings={practiceSettings}
          patientPhone={activeCertificateToPrint.patientPhone}
          onClose={() => setActiveCertificateToPrint(null)}
        />
      )}
    </div>
  );
};
