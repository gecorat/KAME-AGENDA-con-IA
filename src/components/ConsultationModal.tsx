import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Square,
  Save,
  Trash2,
  Calendar,
  CheckCircle2,
  Loader2,
  Sparkles,
  History,
  ChevronDown,
  User,
  FileText,
  Volume2,
  Zap,
  Clock,
  Plus,
  AlertCircle
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import {
  ConsultationRecord,
  VoiceNote,
  Patient
} from '../types';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { ConfirmModal } from './ConfirmModal';
import { getClientTerm, getConsultationTerm } from '../lib/terminology';

interface ConsultationModalProps {
  consultation?: ConsultationRecord | null;
  patientId?: string;
  appointmentId?: string;
  onClose: () => void;
  onSaved?: (consultation: ConsultationRecord) => void;
}

export const ConsultationModal: React.FC<ConsultationModalProps> = ({
  consultation: initialConsultation,
  patientId: initialPatientId,
  appointmentId,
  onClose,
  onSaved
}) => {
  const {
    patients,
    practiceSettings,
    consultations,
    appointments,
    addConsultation,
    updateConsultation,
    deleteConsultation,
    updateAppointment
  } = useAgendaStore();

  const linkedAppointment = appointmentId ? appointments.find(a => a.id === appointmentId) : undefined;
  const clientTermSingular = getClientTerm(practiceSettings, { plural: false, capitalize: true });
  const consultationTermSingular = getConsultationTerm(practiceSettings, { plural: false, capitalize: true });

  // Selected Patient / Client
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    if (initialConsultation) return initialConsultation.patient_id;
    if (initialPatientId) return initialPatientId;
    if (linkedAppointment?.patient_id) return linkedAppointment.patient_id;
    return patients[0]?.id || '';
  });

  const currentPatient: Patient | undefined = patients.find(p => p.id === selectedPatientId);

  // Filter all previous consultations for this patient sorted by date descending
  const patientConsultations = consultations
    .filter(c => c.patient_id === selectedPatientId)
    .sort((a, b) => new Date(b.date || b.created_at || 0).getTime() - new Date(a.date || a.created_at || 0).getTime());

  // Active consultation being edited (null = new consultation)
  const [activeConsultationId, setActiveConsultationId] = useState<string | null>(
    initialConsultation ? initialConsultation.id : null
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // History dropdown state
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const historyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target as Node)) {
        setShowHistoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Form Fields
  const [date, setDate] = useState<string>(() => {
    if (initialConsultation?.date) return initialConsultation.date.split('T')[0];
    if (linkedAppointment?.date) return linkedAppointment.date;
    if (linkedAppointment?.start_datetime) return linkedAppointment.start_datetime.split('T')[0];
    return new Date().toISOString().split('T')[0];
  });
  const [reasonForVisit, setReasonForVisit] = useState(
    initialConsultation?.reason_for_visit || (linkedAppointment ? `${linkedAppointment.service_name}` : '')
  );
  const [treatmentPerformed, setTreatmentPerformed] = useState(
    initialConsultation?.treatment_performed || initialConsultation?.clinical_evolution || initialConsultation?.soap_analysis || ''
  );
  const [soapPlan, setSoapPlan] = useState(initialConsultation?.soap_plan || '');

  // Attached Voice Notes
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>(initialConsultation?.voice_notes || []);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  // Live Web Speech Recognition states for direct dictation into Notes & Tasks
  const [dictatingField, setDictatingField] = useState<'notes' | 'plan' | null>(null);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const dictatingFieldRef = useRef<'notes' | 'plan' | null>(null);

  useEffect(() => {
    dictatingFieldRef.current = dictatingField;
  }, [dictatingField]);

  // AI refinement state
  const [isRefiningAI, setIsRefiningAI] = useState(false);

  // Switch to a past consultation or create a new one
  const handleSelectConsultation = (c: ConsultationRecord | null) => {
    setShowHistoryDropdown(false);
    setDictationError(null);
    stopLiveDictation();
    if (c) {
      setActiveConsultationId(c.id);
      setDate(c.date ? c.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setReasonForVisit(c.reason_for_visit || '');
      setTreatmentPerformed(c.treatment_performed || c.clinical_evolution || c.soap_analysis || '');
      setSoapPlan(c.soap_plan || '');
      setVoiceNotes(c.voice_notes || []);
    } else {
      setActiveConsultationId(null);
      setDate(new Date().toISOString().split('T')[0]);
      setReasonForVisit('');
      setTreatmentPerformed('');
      setSoapPlan('');
      setVoiceNotes([]);
    }
  };

  const stopLiveDictation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Error stopping speech recognition:', e);
      }
    }
    setDictatingField(null);
  };

  // Toggle Live Speech-to-Text Dictation directly into Notes or Plan
  const toggleLiveDictation = (targetField: 'notes' | 'plan') => {
    setDictationError(null);

    if (dictatingField === targetField) {
      stopLiveDictation();
      return;
    }

    if (dictatingField) {
      stopLiveDictation();
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setDictationError('Tu navegador no soporta el dictado directo. Puedes utilizar la Grabadora de Audios más abajo o probar en Google Chrome / Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setDictatingField(targetField);
        setDictationError(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentTranscript += transcript + ' ';
          }
        }
        if (currentTranscript) {
          const activeField = dictatingFieldRef.current;
          if (activeField === 'notes') {
            setTreatmentPerformed(prev => prev ? `${prev.trim()} ${currentTranscript.trim()}` : currentTranscript.trim());
          } else if (activeField === 'plan') {
            setSoapPlan(prev => prev ? `${prev.trim()} ${currentTranscript.trim()}` : currentTranscript.trim());
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setDictatingField(null);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setDictationError('Permiso de micrófono bloqueado o denegado por el navegador/iFrame. Puedes habilitarlo en el navegador o usar la Grabadora de Audios (o la demo) más abajo.');
        } else if (event.error === 'no-speech') {
          // ignore silent no-speech timeout
        } else {
          setDictationError(`Inconveniente con el dictado (${event.error}). Puedes utilizar la Grabadora de Audios más abajo.`);
        }
      };

      recognition.onend = () => {
        setDictatingField(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Failed to start speech recognition:', err);
      setDictatingField(null);
      setDictationError('No se pudo iniciar el dictado automático. Puedes usar la Grabadora de Audios más abajo.');
    }
  };

  // AI Refine Notes
  const handleAIRefine = async () => {
    if (!treatmentPerformed.trim()) {
      alert('Escribe o dicta algunas notas primero para que la IA pueda organizarlas.');
      return;
    }
    setIsRefiningAI(true);
    try {
      // Simple local structured cleanup
      const lines = treatmentPerformed.split('\n').filter(l => l.trim().length > 0);
      const formatted = lines.map(line => `• ${line.replace(/^[•\-\*]\s*/, '')}`).join('\n');
      setTreatmentPerformed(`SÍNTESIS DE LA SESIÓN:\n${formatted}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefiningAI(false);
    }
  };

  // Save Consultation / Session Record
  const handleSaveConsultation = () => {
    if (!currentPatient) {
      alert(`Por favor selecciona un ${clientTermSingular.toLowerCase()}`);
      return;
    }
    if (!reasonForVisit.trim() && !treatmentPerformed.trim()) {
      alert('Por favor especifica al menos el asunto/motivo o las notas de la sesión.');
      return;
    }

    const payload: Partial<ConsultationRecord> = {
      patient_id: selectedPatientId,
      patient_name: `${currentPatient.first_name} ${currentPatient.last_name}`,
      appointment_id: appointmentId,
      date: new Date(date + 'T12:00:00').toISOString(),
      reason_for_visit: reasonForVisit.trim() || `${consultationTermSingular}`,
      treatment_performed: treatmentPerformed.trim() || undefined,
      clinical_evolution: treatmentPerformed.trim() || undefined,
      soap_analysis: treatmentPerformed.trim() || undefined,
      soap_plan: soapPlan.trim() || undefined,
      voice_notes: voiceNotes
    };

    let savedRecord: ConsultationRecord;
    if (activeConsultationId) {
      updateConsultation(activeConsultationId, payload);
      savedRecord = { ...(initialConsultation || {}), ...payload, id: activeConsultationId } as ConsultationRecord;
    } else {
      savedRecord = addConsultation(payload as any);
      setActiveConsultationId(savedRecord.id);
    }

    // Automatically mark the linked appointment as completed (atendido)
    if (appointmentId) {
      updateAppointment(appointmentId, { status: 'completed' });
    }

    if (onSaved) {
      onSaved(savedRecord);
    }
    onClose();
  };

  const handleDeleteConsultation = () => {
    if (activeConsultationId) {
      deleteConsultation(activeConsultationId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                {activeConsultationId ? `Editar ${consultationTermSingular}` : `Nueva ${consultationTermSingular}`}
              </h3>
              <p className="text-xs text-neutral-300">
                {currentPatient ? `${currentPatient.first_name} ${currentPatient.last_name}` : 'Selecciona un registro'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* History Selector Dropdown */}
            {patientConsultations.length > 0 && (
              <div className="relative" ref={historyDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 border border-neutral-700 transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Histórico ({patientConsultations.length})</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showHistoryDropdown && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-neutral-200 text-neutral-900 z-50 py-1 overflow-hidden">
                    <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-700">Sesiones Anteriores</span>
                      <button
                        onClick={() => handleSelectConsultation(null)}
                        className="text-[11px] font-medium text-sky-600 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Crear Nueva
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-neutral-100">
                      {patientConsultations.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectConsultation(c)}
                          className={`w-full text-left px-3 py-2 hover:bg-sky-50/50 transition-colors flex flex-col gap-0.5 ${
                            activeConsultationId === c.id ? 'bg-sky-50 border-l-4 border-sky-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-neutral-900">
                            <span>{c.reason_for_visit || 'Sesión sin título'}</span>
                            <span className="text-[10px] text-neutral-500">
                              {c.date ? new Date(c.date).toLocaleDateString('es-AR') : ''}
                            </span>
                          </div>
                          {(c.treatment_performed || c.soap_analysis) && (
                            <p className="text-[11px] text-neutral-500 line-clamp-1">
                              {c.treatment_performed || c.soap_analysis}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-neutral-700/80 text-neutral-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Patient Selector & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                {clientTermSingular}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <select
                  value={selectedPatientId}
                  onChange={e => setSelectedPatientId(e.target.value)}
                  className="w-full text-xs font-semibold text-neutral-900 border border-neutral-300 rounded-lg pl-9 pr-3 py-2 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} {p.dni ? `(DNI/CUIT: ${p.dni})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                Fecha de la Sesión
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full text-xs font-semibold text-neutral-900 border border-neutral-300 rounded-lg pl-9 pr-3 py-2 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Reason / Asunto Principal */}
          <div>
            <label className="text-xs font-bold text-neutral-800 block mb-1">
              Asunto / Motivo de la Cita o Sesión
            </label>
            <input
              type="text"
              value={reasonForVisit}
              onChange={e => setReasonForVisit(e.target.value)}
              placeholder="ej. Control periódico, revisión de caso, sesión semanal, consulta de seguimiento..."
              className="w-full text-xs font-medium text-neutral-900 border border-neutral-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
            
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                'Control regular',
                'Primera consulta / Evaluación',
                'Reunión de seguimiento',
                'Tratamiento / Plan en curso',
                'Consulta urgente / Inmediata',
                'Cierre y próximos pasos'
              ].map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setReasonForVisit(chip)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-sky-50 hover:text-sky-700 text-neutral-600 border border-neutral-200 transition-colors"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Main Session Notes (Notas de la Sesión / Evolución) */}
          <div className="border border-neutral-200 rounded-xl p-3 sm:p-4 bg-white shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-600" />
                Notas de la Sesión / Desarrollo / Registro
              </label>

              <div className="flex items-center gap-2">
                {/* Speech-to-Text Button */}
                <button
                  type="button"
                  id="btn-dictate-notes"
                  onClick={() => toggleLiveDictation('notes')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dictatingField === 'notes'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-md'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300'
                  }`}
                  title={dictatingField === 'notes' ? 'Presiona para detener el dictado' : 'Iniciar dictado por voz'}
                >
                  {dictatingField === 'notes' ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Terminar de Dictar</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-sky-600" />
                      <span>Dictar por Voz</span>
                    </>
                  )}
                </button>

                {/* AI Refine */}
                <button
                  type="button"
                  onClick={handleAIRefine}
                  disabled={isRefiningAI}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>{isRefiningAI ? 'Organizando...' : 'Formatear'}</span>
                </button>
              </div>
            </div>

            {dictatingField === 'notes' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                <span>Dictando notas en tiempo real... Presiona <strong>"Terminar de Dictar"</strong> para detener.</span>
              </div>
            )}

            {dictationError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Aviso sobre el micrófono:</span>
                    <span>{dictationError}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDictationError(null);
                    setShowVoiceRecorder(true);
                  }}
                  className="text-amber-800 underline font-semibold shrink-0 text-xs hover:text-amber-950 whitespace-nowrap"
                >
                  Usar Grabadora / Demo
                </button>
              </div>
            )}

            <textarea
              rows={6}
              value={treatmentPerformed}
              onChange={e => setTreatmentPerformed(e.target.value)}
              placeholder="Escribe o dicta aquí los detalles de la atención, notas tomadas, conclusiones, puntos hablados o avances de la sesión..."
              className="w-full text-xs font-normal text-neutral-900 border border-neutral-300 rounded-lg p-3 focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Next Steps / Acuerdos / Tareas */}
          <div className="border border-neutral-200 rounded-xl p-3 sm:p-4 bg-neutral-50/50 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Próximos Pasos / Tareas / Acuerdos para la Siguiente Cita
              </label>

              {/* Dictar por Voz Button for Plan / Tasks */}
              <button
                type="button"
                id="btn-dictate-plan"
                onClick={() => toggleLiveDictation('plan')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dictatingField === 'plan'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-md'
                    : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300'
                }`}
                title={dictatingField === 'plan' ? 'Presiona para detener el dictado' : 'Iniciar dictado de tareas'}
              >
                {dictatingField === 'plan' ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Terminar de Dictar</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dictar por Voz</span>
                  </>
                )}
              </button>
            </div>

            {dictatingField === 'plan' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                <span>Dictando tareas en tiempo real... Presiona <strong>"Terminar de Dictar"</strong> para detener.</span>
              </div>
            )}

            <textarea
              rows={3}
              value={soapPlan}
              onChange={e => setSoapPlan(e.target.value)}
              placeholder="ej. Enviar documento antes del viernes / Traer estudios actualizados / Repaso de ejercitación..."
              className="w-full text-xs font-normal text-neutral-900 border border-neutral-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
            />

            {/* Quick chips for Next Steps / Tasks */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[
                'Enviar documento o informe',
                'Confirmar fecha de próxima sesión',
                'Traer estudios / análisis clínicos',
                'Realizar ejercitación asignada',
                'Seguimiento por WhatsApp'
              ].map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setSoapPlan(prev => prev ? `${prev.trim()}\n• ${chip}` : `• ${chip}`)}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-white hover:bg-emerald-50 hover:text-emerald-800 text-neutral-600 border border-neutral-200 transition-colors"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Audio Recorder Section */}
          <div className="border border-neutral-200 rounded-xl p-3 sm:p-4 bg-white shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-sky-600" />
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Audios Grabados en la Sesión ({voiceNotes.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {showVoiceRecorder ? 'Ocultar Grabadora' : 'Grabar Audio de Nota'}
              </button>
            </div>

            {showVoiceRecorder && (
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <VoiceNoteRecorder
                  patientName={currentPatient ? `${currentPatient.first_name} ${currentPatient.last_name}` : 'Cliente'}
                  specialty="Registro de Sesión"
                  onTranscriptionComplete={(data) => {
                    const newAudio: VoiceNote = {
                      id: `vn-${Date.now()}`,
                      recorded_at: new Date().toISOString(),
                      duration_seconds: data.durationSeconds,
                      audio_url: data.audioUrl,
                      transcription: data.transcription
                    };
                    setVoiceNotes(prev => [newAudio, ...prev]);
                    if (data.transcription && !treatmentPerformed) {
                      setTreatmentPerformed(data.transcription);
                    }
                    setShowVoiceRecorder(false);
                  }}
                />
              </div>
            )}

            {/* List of Attached Voice Notes */}
            {voiceNotes.length > 0 && (
              <div className="space-y-2 pt-1">
                {voiceNotes.map((vn, idx) => (
                  <div key={vn.id || idx} className="p-3 bg-sky-50/60 border border-sky-200 rounded-lg flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
                        <Volume2 className="w-3.5 h-3.5 text-sky-600" />
                        <span>Audio #{voiceNotes.length - idx}</span>
                        <span className="text-[10px] text-neutral-500 font-normal">
                          ({vn.duration_seconds}s)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVoiceNotes(prev => prev.filter(item => item.id !== vn.id))}
                        className="text-neutral-400 hover:text-red-600 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {vn.audio_url && (
                      <audio controls src={vn.audio_url} className="w-full h-8 mt-1" />
                    )}

                    {vn.transcription && (
                      <p className="text-[11px] text-neutral-700 italic bg-white p-2 rounded border border-sky-100">
                        "{vn.transcription}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between shrink-0">
          <div>
            {activeConsultationId && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Ficha</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-200/60 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSaveConsultation}
              className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Sesión</span>
            </button>
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="¿Eliminar esta Ficha / Sesión?"
        message="Esta acción borrará las notas registradas en esta sesión. No afectará los turnos agendados del cliente."
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleDeleteConsultation}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
